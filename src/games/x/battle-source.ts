import type { BattleBattler, BattleReading } from '../../models/battle.ts'
import type { CombatParticipant } from '../../models/combat.ts'
import type { SavedRosterPokemon } from '../core/saved-roster.ts'
import type { FieldCombatReading, FieldPokemon } from '../core/combat.ts'

function participant(p: BattleBattler | null): CombatParticipant | null {
  return p ? { identity: p.identity, speciesId: p.speciesId, form: p.form, level: p.level, slot: p.partySlot, health: { currentHp: p.currentHp, maxHp: p.maxHp }, stages: p.statStages ?? null } : null
}

export function normalizeXFieldBattle(reading: BattleReading | null | undefined, status: 'ready' | 'waiting' | 'error', party: readonly SavedRosterPokemon[]): FieldCombatReading {
  const common = { status, messageCode: null }
  if (status === 'ready' && reading?.active === false) return { ...common, activity: 'inactive', field: null }
  if (!reading?.field) return { ...common, activity: 'unknown', field: null }
  const identity = (p: SavedRosterPokemon) => `${p.speciesId}:${p.personality}:${p.trainerId}`
  const playerTeam: FieldPokemon[] | null = party.length ? party.map(p => ({ identity: identity(p), ownerId: 'player', partySlot: p.slot, speciesId: p.speciesId, form: p.form, level: p.level, nickname: p.nickname, isEgg: p.isEgg,
    health: p.partyMember?.currentHp !== undefined && (p.partyMember.maxHp ?? 0) > 0 ? { currentHp: p.partyMember.currentHp, maxHp: p.partyMember.maxHp! } : null, stages: null })) : null
  const own = reading.field.sides[0]
  const field = { ...reading.field, sides: [{ ...own, positions: own.positions.map(position => {
    if (position.state !== 'occupied') return position
    const member = playerTeam?.find(p => p.identity === position.pokemon.identity && p.form === position.pokemon.form)
    return { ...position, pokemon: { ...position.pokemon, nickname: member?.nickname } }
  }) }, reading.field.sides[1]] as typeof reading.field.sides }
  return { ...common, activity: status === 'ready' && reading.active ? 'active' : 'unknown', field, playerTeam }
}
export function normalizeXBattle(reading: BattleReading | null | undefined, status: 'ready' | 'waiting' | 'error', party: readonly SavedRosterPokemon[]) {
  const own = participant(reading?.own ?? null)
  if (own) own.nickname = party.find(p => p.slot === own.slot)?.nickname
  return { status, active: reading?.active ?? null, own, enemy: participant(reading?.enemy ?? null), opponentRosterTotal: reading?.opponentRosterTotal ?? null,
    team: party.length ? party.map(p => ({ identity: `${p.speciesId}:${p.personality}:${p.trainerId}`, speciesId: p.speciesId, form: p.form, level: p.level, slot: p.slot, nickname: p.nickname, isEgg: p.isEgg,
      health: own?.slot === p.slot ? own.health : p.partyMember?.currentHp !== undefined && (p.partyMember.maxHp ?? 0) > 0 ? { currentHp: p.partyMember.currentHp, maxHp: p.partyMember.maxHp! } : null, stages: own?.slot === p.slot ? own.stages : null })) : null }
}
