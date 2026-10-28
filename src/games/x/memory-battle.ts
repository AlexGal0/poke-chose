import type { MemoryReader } from './memory-party.ts'
import type { SavedPartyMember } from '../../models/party.ts'
import type { BattleReading } from '../../models/battle.ts'
import { readXMemoryParty } from './memory-party.ts'
import { BATTLE_STATS } from '../../domain/battle-stat-stages.ts'
import type { BattleStatStages } from '../../domain/battle-stat-stages.ts'

// Locally validated X Nightly 2104 profile: single wild and trainer battles.
export const X_BATTLE_POINTERS = [0x081fb284, 0x081fb624, 0x081fb2a0, 0x081fb640] as const
export const X_BATTLE_ENEMY_COPIES = [0x081feba0, 0x081ff744] as const
export const X_BATTLE_STAGES_OFFSET = 0x104
export const X_BATTLE_STATE_ADDRESS = 0x081fb170
export const X_BATTLE_ENEMY_PARTY_PROFILES = X_BATTLE_ENEMY_COPIES.map(firstMember => ({
  firstMember, stride: 484, statsOffset: 344, countAddress: firstMember - 0x74, tableAddress: firstMember - 0x8c,
}))

export function decodeXBattleStages(bytes: Uint8Array): BattleStatStages | null {
  if (bytes.length !== 7 || bytes.some(value => value > 12)) return null
  return Object.fromEntries(BATTLE_STATS.map((stat, index) => [stat, bytes[index] - 6])) as BattleStatStages
}

export async function readXMemoryBattle(reader: MemoryReader, party: readonly SavedPartyMember[]): Promise<BattleReading> {
  async function header() {
    const pointers = await Promise.all(X_BATTLE_POINTERS.map(async address => {
      const bytes = await reader.read(address, 4)
      if (bytes.length !== 4) throw new Error('Incomplete X battle pointer')
      return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true)
    }))
    const bytes = await reader.read(X_BATTLE_STATE_ADDRESS, 4)
    if (bytes.length !== 4) throw new Error('Incomplete X battle flag')
    return { pointers, flag: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) }
  }
  async function pass(): Promise<BattleReading> {
    const before = await header()
    const { pointers, flag } = before
    const inactive = flag === 0x40000 && pointers[1] === 0 && pointers[3] === 0 && pointers[0] < 0x08000000 && pointers[2] < 0x08000000
    if (inactive) {
      if (JSON.stringify(await header()) !== JSON.stringify(before)) throw new Error('X battle started during read')
      return { active: false, own: null, enemy: null }
    }
    if (flag !== 0x40001) throw new Error('Unconfirmed X battle flag')
    if (pointers.some(p => p < 0x08000000 || p > 0x08df0000 - X_BATTLE_STAGES_OFFSET - 7) || new Set(pointers).size !== 4) throw new Error('Unconfirmed X battle pointers')
    const blocks = await Promise.all(pointers.map(p => reader.read(p, 32)))
    const state = (bytes: Uint8Array) => {
      if (bytes.length !== 32) throw new Error('Incomplete X battle state')
      const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const speciesId = v.getUint16(12, true), maxHp = v.getUint16(14, true), currentHp = v.getUint16(16, true)
      if (speciesId < 1 || speciesId > 721 || maxHp === 0 || currentHp > maxHp) throw new Error('Invalid X battle state')
      return { speciesId, maxHp, currentHp }
    }
    const states = blocks.map(state)
    if (JSON.stringify(states[0]) !== JSON.stringify(states[1]) || JSON.stringify(states[2]) !== JSON.stringify(states[3])) throw new Error('X battle copies disagree')
    const stages = await Promise.all(pointers.map(async p => decodeXBattleStages(await reader.read(p + X_BATTLE_STAGES_OFFSET, 7))))
    const confirmedStages = (first: number, second: number) => stages[first] && JSON.stringify(stages[first]) === JSON.stringify(stages[second]) ? stages[first] : null
    const teams = await Promise.all(X_BATTLE_ENEMY_PARTY_PROFILES.map(profile => readXMemoryParty(reader, profile)))
    if (teams[0].length !== teams[1].length) throw new Error('X rival team sizes disagree')
    const candidates = teams.map(team => team.filter(p => !p.isEgg && p.speciesId === states[2].speciesId && p.maxHp === states[2].maxHp))
    if (candidates.some(matches => matches.length !== 1)) throw new Error('Unconfirmed X rival')
    const enemy = candidates[0][0]
    if (JSON.stringify(enemy) !== JSON.stringify(candidates[1][0])) throw new Error('X rival copies disagree')
    const matches = party.filter(p => !p.isEgg && p.speciesId === states[0].speciesId && p.maxHp === states[0].maxHp)
    const own = matches.length === 1 ? matches[0] : null
    if (JSON.stringify(before) !== JSON.stringify(await header())) throw new Error('X battle pointers changed')
    const identity = (p: { speciesId: number; personality: number; trainerId: number }) => `${p.speciesId}:${p.personality}:${p.trainerId}`
    return { active: true, opponentRosterTotal: teams[0].length, own: own ? { ...states[0], identity: identity(own), form: own.form, level: own.level, partySlot: own.slot, statStages: confirmedStages(0, 1) } : null,
      enemy: { ...states[2], identity: identity(enemy), form: enemy.form, level: enemy.level, partySlot: enemy.slot, statStages: confirmedStages(2, 3) } }
  }
  const first = await pass(), second = await pass()
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('X battle changed during read')
  return second
}
