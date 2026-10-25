import { validStatStages } from '../domain/battle-stat-stages.ts'
import type { BattleStatStages } from '../domain/battle-stat-stages.ts'

export interface BattleBattler {
  identity: string
  speciesId: number
  form: number
  level: number | null
  currentHp: number
  maxHp: number
  partySlot: number | null
  statStages?: BattleStatStages | null
}
export interface BattleReading { active: boolean; own: BattleBattler | null; enemy: BattleBattler | null }

export function isBattleReading(value: unknown, maxSpecies: number): value is BattleReading {
  if (!value || typeof value !== 'object') return false
  const s = value as BattleReading
  const integer = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max
  const battler = (p: BattleBattler) => !!p && typeof p.identity === 'string' && /^[0-9:]+$/.test(p.identity) && p.identity.length <= 128 && integer(p.speciesId, 1, maxSpecies) && integer(p.form, 0, 31) &&
    (p.level === null || integer(p.level, 1, 100)) && integer(p.maxHp, 1, 65535) && integer(p.currentHp, 0, p.maxHp) && (p.partySlot === null || integer(p.partySlot, 0, 5)) &&
    (p.statStages == null || validStatStages(p.statStages))
  return s.active === false ? s.own === null && s.enemy === null : s.active === true && battler(s.enemy!) && (s.own === null || battler(s.own))
}
