import { validStatStages } from '../domain/battle-stat-stages.ts'
import type { BattleStatStages } from '../domain/battle-stat-stages.ts'
import type { CombatField } from '../games/core/combat.ts'
import { validCombatField } from '../domain/combat-field.ts'

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
export interface BattleReading {
  active: boolean
  own: BattleBattler | null
  enemy: BattleBattler | null
  // Optional extension for older bridge snapshots. X's single-trainer roster.
  opponentRosterTotal?: number | null
  field?: CombatField
}

export function isBattleField(value: unknown, maxSpecies: number): value is CombatField {
  try {
    const field = value as CombatField
    if (!field || !Array.isArray(field.sides) || field.sides.length !== 2 || !validCombatField(field)) return false
    if (field.format.state !== 'unknown' && (field.format.state !== 'known' || field.format.value.kind !== 'general' || !['single', 'double', 'horde'].includes(field.format.value.id))) return false
    const integer = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max
    return field.sides.every(side => side.owners.length <= 6 && side.positions.length <= 6 && side.id.length <= 128 &&
      (side.rosterTotal.state === 'unknown' || side.rosterTotal.state === 'known' && integer(side.rosterTotal.value, 1, 6)) &&
      side.owners.every(owner => owner.id.length <= 128) && side.positions.every(position => position.id.length <= 128 && (
        position.state === 'unknown' || position.state === 'empty' || position.state === 'occupied' &&
        typeof position.pokemon.identity === 'string' && /^[0-9:]+$/.test(position.pokemon.identity) && position.pokemon.identity.length <= 128 &&
        integer(position.pokemon.speciesId, 1, maxSpecies) && integer(position.pokemon.form, 0, 31) &&
        (position.pokemon.level === null || integer(position.pokemon.level, 1, 100)) &&
        (position.pokemon.partySlot === null || integer(position.pokemon.partySlot, 0, 5)) &&
        (position.pokemon.health === null || !!position.pokemon.health && integer(position.pokemon.health.maxHp, 1, 65535) && integer(position.pokemon.health.currentHp, 0, position.pokemon.health.maxHp)) &&
        (position.pokemon.stages === null || validStatStages(position.pokemon.stages)))))
  } catch { return false }
}

export function isBattleReading(value: unknown, maxSpecies: number): value is BattleReading {
  if (!value || typeof value !== 'object') return false
  const s = value as BattleReading
  if (s.field !== undefined && (s.active !== true || !isBattleField(s.field, maxSpecies))) return false
  const integer = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max
  if (s.opponentRosterTotal != null && (!integer(s.opponentRosterTotal, 1, 6) || s.active !== true ||
    (s.enemy?.partySlot != null && s.enemy.partySlot >= s.opponentRosterTotal))) return false
  const battler = (p: BattleBattler) => !!p && typeof p.identity === 'string' && /^[0-9:]+$/.test(p.identity) && p.identity.length <= 128 && integer(p.speciesId, 1, maxSpecies) && integer(p.form, 0, 31) &&
    (p.level === null || integer(p.level, 1, 100)) && integer(p.maxHp, 1, 65535) && integer(p.currentHp, 0, p.maxHp) && (p.partySlot === null || integer(p.partySlot, 0, 5)) &&
    (p.statStages == null || validStatStages(p.statStages))
  return s.active === false ? s.own === null && s.enemy === null : s.active === true && (s.enemy === null && s.field !== undefined || battler(s.enemy!)) && (s.own === null || battler(s.own))
}
