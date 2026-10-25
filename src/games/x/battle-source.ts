import type { BattleBattler, BattleReading } from '../../models/battle.ts'
import type { CombatParticipant } from '../../models/combat.ts'
import type { SavedRosterPokemon } from '../core/saved-roster.ts'

function participant(p: BattleBattler | null): CombatParticipant | null {
  return p ? { identity: p.identity, speciesId: p.speciesId, form: p.form, level: p.level, slot: p.partySlot, health: { currentHp: p.currentHp, maxHp: p.maxHp }, stages: p.statStages ?? null } : null
}
export function normalizeXBattle(reading: BattleReading | null | undefined, status: 'ready' | 'waiting' | 'error', party: readonly SavedRosterPokemon[]) {
  const own = participant(reading?.own ?? null)
  if (own) own.nickname = party.find(p => p.slot === own.slot)?.nickname
  return { status, active: reading?.active ?? null, own, enemy: participant(reading?.enemy ?? null),
    team: party.length ? party.map(p => ({ identity: `${p.speciesId}:${p.personality}:${p.trainerId}`, speciesId: p.speciesId, form: p.form, level: p.level, slot: p.slot, nickname: p.nickname, isEgg: p.isEgg,
      health: own?.slot === p.slot ? own.health : p.partyMember?.currentHp !== undefined && (p.partyMember.maxHp ?? 0) > 0 ? { currentHp: p.partyMember.currentHp, maxHp: p.partyMember.maxHp! } : null, stages: own?.slot === p.slot ? own.stages : null })) : null }
}
