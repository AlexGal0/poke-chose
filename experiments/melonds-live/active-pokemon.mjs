import { parsePk5 } from '../../bridge/parser.ts'
import { readParty } from '../../bridge/live/party.mjs'
import { fieldVitals } from './battle-vitals.mjs'
import { consistentBattleHealth } from '../../src/domain/enemy-prototype.ts'
import { readBattleTables, battleRecordAddress, confirmBattleTables } from './battle-tables.mjs'
import { readStatStageBytes, stableStatStages } from './battle-stat-stages.mjs'

// These are party record arrays, not the active record itself. The battle's
// selected slot chooses the element; never assume that slot zero is active.
export async function readActiveCandidates(reader, config) {
  return (await readOwnBattle(reader, config, false)).activeCandidates
}

export async function readOwnBattle(reader, config, allSlots = true) {
  const tables = await readBattleTables(reader, config)
  const addresses = tables ? tables.map(table => battleRecordAddress(table, 0)) : config.activeBattleAddresses ?? []
  if (!addresses.length || (!tables && !config.activeSlotAddress)) return { activeCandidates: [], battleTeam: null }
  const slotAddress = Number(config.activeSlotAddress)
  if (!tables && (!Number.isInteger(slotAddress) || slotAddress < 0x02000000 || slotAddress >= 0x02400000)) throw new Error('Dirección de selección activa inválida.')
  const selectedBefore = tables ? Buffer.from([0]) : await reader.readMemory(slotAddress, 1)
  const battleSlot = selectedBefore[0]
  if (battleSlot > 5) throw new Error('Índice activo inválido.')
  if (addresses.length > 8 || addresses.some(address => !Number.isInteger(Number(address)) || Number(address) - 12 < 0x02000000 || Number(address) + 5 * 0x224 + 16 > 0x02400000)) throw new Error('Direcciones del Pokémon activo inválidas.')
  const party = await readParty(reader, config)
  const candidates = []
  const slots = allSlots ? Array.from({ length: party.length }, (_, index) => index) : [battleSlot]
  for (const selectedSlot of slots) {
    for (const [copy, configuredAddress] of addresses.entries()) {
      let address = Number(configuredAddress) + selectedSlot * 0x224
      try {
        if (tables) address = battleRecordAddress(tables[copy], selectedSlot)
        const first = await reader.readMemory(address - 12, 28)
        const stagesBefore = selectedSlot === battleSlot ? await readStatStageBytes(reader, address, config) : null
        const pointer = first.readUInt32LE(0)
        if (pointer < 0x02000000 || pointer + 220 > 0x02400000) throw new Error('Puntero del Pokémon activo inválido.')
        const pokemon = await reader.readMemory(pointer, 220)
        const confirmation = await reader.readMemory(pointer, 220)
        const stagesAfter = selectedSlot === battleSlot ? await readStatStageBytes(reader, address, config) : null
        const second = await reader.readMemory(address - 12, 28)
        if (!first.equals(second) || !pokemon.equals(confirmation)) throw new Error('El Pokémon activo cambió durante la lectura.')
        const member = parsePk5(pokemon)
        if (member.isEgg || member.speciesId !== first.readUInt16LE(12) || member.level !== first[24]) throw new Error('Identidad del campo y del ejemplar distintas.')
        const own = party.find(own => own.personality === member.personality && own.trainerId === member.trainerId && own.speciesId === member.speciesId)
        if (!own) throw new Error('El Pokémon activo no pertenece a tu equipo.')
        let vitals = {}
        try { vitals = fieldVitals(first) } catch { /* Keep identity available while HP is unconfirmed. */ }
        candidates.push({ address: `0x${address.toString(16)}`, speciesId: member.speciesId, form: member.form, level: member.level, personality: member.personality, trainerId: member.trainerId, nickname: member.nickname, slot: own.slot, battleSlot: selectedSlot, ...vitals, ...stableStatStages(stagesBefore, stagesAfter) })
      } catch (error) {
        if (reader.socket?.destroyed) throw error
        candidates.push({ address: `0x${address.toString(16)}`, battleSlot: selectedSlot, error: error.message })
      }
    }
  }
  if (tables) await confirmBattleTables(reader, config, tables)
  const selectedAfter = tables ? selectedBefore : await reader.readMemory(slotAddress, 1)
  if (!selectedBefore.equals(selectedAfter)) throw new Error('La selección activa cambió durante la lectura.')
  const battleTeam = allSlots ? party.map(member => {
    const copies = candidates.filter(candidate => candidate.personality === member.personality && candidate.trainerId === member.trainerId && candidate.speciesId === member.speciesId)
    const health = !member.isEgg && copies.length === addresses.length ? consistentBattleHealth(member, copies) : null
    return { address: '', speciesId: member.speciesId, personality: member.personality, trainerId: member.trainerId, form: member.form, level: member.level, nickname: member.nickname, slot: member.slot, isEgg: member.isEgg, currentHp: health?.currentHp, maxHp: health?.maxHp }
  }) : null
  return { activeCandidates: candidates.filter(candidate => candidate.battleSlot === battleSlot), battleTeam }
}
