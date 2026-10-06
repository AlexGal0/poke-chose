import { parsePk5 } from '../../bridge/parser.ts'
import { consistentEnemyCandidate } from '../../src/domain/enemy-prototype.ts'
import { readBattleTables, battleRecordAddress, confirmBattleTables } from './battle-tables.mjs'
import { readStatStageBytes, stableStatStages } from './battle-stat-stages.mjs'

// Offsets are relative to the species field in the observed battle parameters.
// PK5 party copies can retain pre-battle HP, so never use their HP as a fallback.
export function fieldVitals(record) {
  const maxHp = record.readUInt16LE(14)
  const currentHp = record.readUInt16LE(16)
  if (!maxHp || currentHp > maxHp) throw new Error('PS del campo inválidos.')
  return { currentHp, maxHp }
}

// Confirm the opponent through both field records, not wild encounter copies.
// The pointers follow the active opponent when a trainer changes Pokémon.
export async function readEnemyBattle(reader, config) {
  const tables = await readBattleTables(reader, config)
  const addresses = tables ? tables.map(table => battleRecordAddress(table, 7)) : config.enemyBattleAddresses ?? []
  if (addresses.length < 2 || addresses.length > 8 || addresses.some(value => !Number.isInteger(Number(value)) || Number(value) - 12 < 0x02000000 || Number(value) + 16 > 0x02400000)) throw new Error('Direcciones del rival en combate inválidas.')
  const candidates = []
  for (const value of addresses) {
    const address = Number(value)
    try {
      const first = await reader.readMemory(address - 12, 28)
      const stagesBefore = await readStatStageBytes(reader, address, config)
      const pointer = first.readUInt32LE(0)
      if (pointer < 0x02000000 || pointer + 220 > 0x02400000) throw new Error('Puntero del rival en combate inválido.')
      const pokemon = await reader.readMemory(pointer, 220)
      const confirmation = await reader.readMemory(pointer, 220)
      const stagesAfter = await readStatStageBytes(reader, address, config)
      const second = await reader.readMemory(address - 12, 28)
      const member = parsePk5(pokemon)
      const confirmed = parsePk5(confirmation)
      if (pointer !== second.readUInt32LE(0) || first.readUInt16LE(12) !== second.readUInt16LE(12) || first[24] !== second[24] ||
        member.isEgg || member.speciesId !== second.readUInt16LE(12) || member.level !== second[24] ||
        !consistentEnemyCandidate([{ address: '', ...member }, { address: '', ...confirmed }])) throw new Error('La identidad del rival cambió durante la lectura.')
      const latestHealth = fieldVitals(second)
      const stableHealth = first.readUInt16LE(14) === second.readUInt16LE(14) && first.readUInt16LE(16) === second.readUInt16LE(16)
      candidates.push({ address: `0x${address.toString(16)}`, speciesId: member.speciesId, form: member.form, level: member.level, personality: member.personality, trainerId: member.trainerId, ...(stableHealth ? latestHealth : {}), ...stableStatStages(stagesBefore, stagesAfter) })
    } catch (error) {
      if (reader.socket?.destroyed) throw error
      candidates.push({ address: `0x${address.toString(16)}`, error: error.message })
    }
  }
  if (tables) await confirmBattleTables(reader, config, tables)
  return candidates
}

export async function readEnemyVitals(reader, config, candidates) {
  const enemy = consistentEnemyCandidate(candidates)
  const addresses = config.enemyBattleAddresses ?? []
  if (!enemy || addresses.length < 2) return []
  if (addresses.length > 8 || addresses.some(value => !Number.isInteger(Number(value)) || Number(value) - 12 < 0x02000000 || Number(value) + 16 > 0x02400000)) throw new Error('Direcciones de PS del rival inválidas.')
  const readings = []
  for (const value of addresses) {
    const address = Number(value)
    const first = await reader.readMemory(address - 12, 28)
    const pointer = first.readUInt32LE(0)
    if (pointer < 0x02000000 || pointer + 220 > 0x02400000) throw new Error('Puntero de PS del rival inválido.')
    const pokemon = await reader.readMemory(pointer, 220)
    const confirmation = await reader.readMemory(pointer, 220)
    const second = await reader.readMemory(address - 12, 28)
    if (!first.equals(second) || !pokemon.equals(confirmation)) throw new Error('Los PS del rival cambiaron durante la lectura.')
    const member = parsePk5(pokemon)
    if (member.isEgg || member.speciesId !== first.readUInt16LE(12) || member.level !== first[24] ||
      member.speciesId !== enemy.speciesId || member.form !== enemy.form || member.personality !== enemy.personality || member.trainerId !== enemy.trainerId || member.level !== enemy.level) throw new Error('Los PS no pertenecen al rival confirmado.')
    readings.push({ address: `0x${address.toString(16)}`, speciesId: member.speciesId, form: member.form, level: member.level, personality: member.personality, trainerId: member.trainerId, ...fieldVitals(first) })
  }
  return readings
}
