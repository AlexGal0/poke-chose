import type { MemoryReader } from './memory-party.ts'
import { readXMemoryMember, readXMemoryParty } from './memory-party.ts'
import type { SavedPartyMember } from '../../models/party.ts'
import type { BattleBattler, BattleReading } from '../../models/battle.ts'
import type { CombatField, CombatPosition, FieldPokemon } from '../core/combat.ts'
import { readXMemoryBattleFormat, X_BATTLE_FORMAT_SELECTOR } from './memory-battle-format.ts'
import { decodeXBattleStages, X_BATTLE_STATE_ADDRESS, X_BATTLE_STAGES_OFFSET, X_BATTLE_ENEMY_PARTY_PROFILES } from './memory-battle.ts'

export const X_BATTLE_FIELD_TABLES = [[0x081fb284, 0x081fb624], [0x081fb2a0, 0x081fb640]] as const
const identity = (pokemon: SavedPartyMember) => `${pokemon.speciesId}:${pokemon.personality}:${pokemon.trainerId}`

// Only the fingerprinted local executable profile. Leading battle-order entries
// are configured field positions; subsequent entries are reserves, not actives.
export async function readXMemoryBattleField(reader: MemoryReader, party: readonly SavedPartyMember[]): Promise<BattleReading> {
  async function exact(address: number, length: number) {
    const bytes = await reader.read(address, length)
    if (bytes.length !== length) throw new Error('Incomplete X field read')
    return Uint8Array.from(bytes)
  }
  async function word(address: number) {
    return new DataView((await exact(address, 4)).buffer).getUint32(0, true)
  }
  async function header() {
    return { flag: await word(X_BATTLE_STATE_ADDRESS), selector: await word(X_BATTLE_FORMAT_SELECTOR), first: await Promise.all(X_BATTLE_FIELD_TABLES.flat().map(word)) }
  }
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  function field(format: CombatField['format']): CombatField {
    return { format, sides: [
      { id: 'player', owners: [{ id: 'player', control: 'player' }], positions: [], rosterTotal: { state: 'unknown' } },
      { id: 'opponent', owners: [{ id: 'opponent', control: format.state === 'known' && format.value.id === 'horde' ? 'wild' : 'opponent' }], positions: [], rosterTotal: { state: 'unknown' } },
    ] }
  }
  async function table(address: number) {
    const bytes = await exact(address, 28), view = new DataView(bytes.buffer)
    const count = view.getUint32(24, true)
    if (count < 1 || count > 6) throw new Error('Invalid X battle roster count')
    return { bytes, count, pointers: Array.from({ length: count }, (_, index) => view.getUint32(index * 4, true)) }
  }
  async function occupant(pointer: number) {
    if (pointer < 0x08000000 || pointer > 0x08df0000 - X_BATTLE_STAGES_OFFSET - 7 || pointer % 4) throw new Error('Invalid X field pointer')
    const bytes = await exact(pointer, 18), view = new DataView(bytes.buffer)
    const object = view.getUint32(0, true)
    if (object < 0x08000000 || object > 0x08df0000 - 430 || object % 4) throw new Error('Invalid X field identity')
    const links = await exact(object, 12), linkView = new DataView(links.buffer)
    if (linkView.getUint32(4, true) !== object + 64 || linkView.getUint32(8, true) !== object + 408) throw new Error('Invalid X field PK6 links')
    const member = await readXMemoryMember(reader, object + 64, 0)
    const speciesId = view.getUint16(12, true), maxHp = view.getUint16(14, true), currentHp = view.getUint16(16, true)
    if (member.isEgg || member.speciesId !== speciesId || !maxHp || currentHp > maxHp) throw new Error('Invalid X field vitals')
    const stages = decodeXBattleStages(await exact(pointer + X_BATTLE_STAGES_OFFSET, 7))
    if (!equal(Array.from(links), Array.from(await exact(object, 12)))) throw new Error('X field PK6 links changed')
    return { identity: identity(member), speciesId, form: member.form, level: member.level, currentHp, maxHp, stages }
  }
  async function pass(): Promise<BattleReading> {
    const before = await header()
    const inactive = before.flag === 0x40000 && before.first[1] === 0 && before.first[3] === 0 && before.first[0] < 0x08000000 && before.first[2] < 0x08000000
    if (inactive) {
      if (!equal(before, await header())) throw new Error('X battle started during field read')
      return { active: false, own: null, enemy: null }
    }
    if (before.flag !== 0x40001) throw new Error('Unconfirmed X field activity')
    const format = await readXMemoryBattleFormat(reader)
    const result = field(format ? { state: 'known', value: { kind: 'general', id: format.format } } : { state: 'unknown' })
    if (format) {
      const tables = await Promise.all(X_BATTLE_FIELD_TABLES.map(async copies => Promise.all(copies.map(table))))
      const enemies = await Promise.all(X_BATTLE_ENEMY_PARTY_PROFILES.map(profile => readXMemoryParty(reader, profile)))
      if (!equal(enemies[0], enemies[1])) throw new Error('X opposing rosters disagree')
      for (const sideIndex of [0, 1] as const) {
        const copies = tables[sideIndex], side = result.sides[sideIndex]
        if (copies[0].count !== copies[1].count || copies[0].count < format.positions[sideIndex]) throw new Error('X field capacities disagree')
        if (sideIndex === 1 && copies[0].count !== enemies[0].length) throw new Error('X rival roster counts disagree')
        side.rosterTotal = { state: 'known', value: copies[0].count }
        const roster = sideIndex === 0 ? party : enemies[0]
        const positions: CombatPosition[] = []
        for (let index = 0; index < format.positions[sideIndex]; index++) {
          const id = String(index)
          const samples = await Promise.all(copies.map(copy => occupant(copy.pointers[index]).catch(() => null)))
          const [a, b] = samples
          if (!a || !b || !equal({ ...a, stages: null }, { ...b, stages: null })) { positions.push({ id, state: 'unknown' }); continue }
          const matches = roster.filter(member => !member.isEgg && identity(member) === a.identity && member.form === a.form)
          // Unmatched own identities may belong to an ally. Do not label them
          // as controlled player Pokémon until that ownership is researched.
          if (matches.length !== 1) { positions.push({ id, state: 'unknown' }); continue }
          const pokemon: FieldPokemon = { identity: a.identity, speciesId: a.speciesId, form: a.form, level: a.level, ownerId: side.id, partySlot: matches[0].slot,
            health: { currentHp: a.currentHp, maxHp: a.maxHp }, stages: equal(a.stages, b.stages) ? a.stages : null }
          positions.push({ id, state: 'occupied', pokemon })
        }
        const identities = positions.flatMap(position => position.state === 'occupied' ? [position.pokemon.identity] : [])
        if (new Set(identities).size !== identities.length) throw new Error('Duplicate X field identities')
        side.positions = positions
      }
      for (const [sideIndex, addresses] of X_BATTLE_FIELD_TABLES.entries()) for (const [copy, address] of addresses.entries()) {
        if (!equal(Array.from(tables[sideIndex][copy].bytes), Array.from((await table(address)).bytes))) throw new Error('X field table changed')
      }
    }
    if (!equal(before, await header())) throw new Error('X field changed during read')
    const legacy = (position: CombatPosition | undefined): BattleBattler | null => position?.state === 'occupied' && position.pokemon.health ? {
      identity: position.pokemon.identity, speciesId: position.pokemon.speciesId, form: position.pokemon.form, level: position.pokemon.level, partySlot: position.pokemon.partySlot,
      ...position.pokemon.health, statStages: position.pokemon.stages,
    } : null
    return { active: true, field: result, own: legacy(result.sides[0].positions[0]), enemy: legacy(result.sides[1].positions[0]),
      opponentRosterTotal: result.sides[1].rosterTotal.state === 'known' ? result.sides[1].rosterTotal.value : null }
  }
  const first = await pass(), second = await pass()
  if (!equal(first, second)) throw new Error('X field changed between passes')
  return second
}
