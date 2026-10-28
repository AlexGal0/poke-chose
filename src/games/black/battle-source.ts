import type { EnemyCandidate, ActivePokemonCandidate, BattleTeamMember } from '../../domain/enemy-prototype.ts'
import { consistentEnemyCandidate, consistentOwnCandidate, consistentBattleHealth } from '../../domain/enemy-prototype.ts'
import { consistentStatStages } from '../../domain/battle-stat-stages.ts'
import type { CombatParticipant } from '../../models/combat.ts'

export interface BlackBattleSnapshot {
  status: string; message: string; candidates: EnemyCandidate[]; updatedAt: string | null
  activeCandidates?: ActivePokemonCandidate[]; activeMessage?: string; enemyVitalsCandidates?: EnemyCandidate[]; battleTeam?: BattleTeamMember[] | null; battleActive?: boolean | null
}
export async function readBlackBattle(signal: AbortSignal): Promise<BlackBattleSnapshot> {
  const response = await fetch('/enemy-api/snapshot', { signal })
  if (!response.ok) throw new Error('prototypeUnavailable')
  const next = await response.json() as BlackBattleSnapshot
  const candidates = (rows: unknown) => Array.isArray(rows) && rows.every(row => row !== null && typeof row === 'object')
  if (!candidates(next.candidates) || typeof next.message !== 'string' || typeof next.status !== 'string' ||
    [next.activeCandidates, next.enemyVitalsCandidates, next.battleTeam].some(rows => rows != null && !candidates(rows))) throw new Error('invalidResponse')
  return next
}
function participant(candidate: ActivePokemonCandidate | null, health: EnemyCandidate[], stages: EnemyCandidate[]): CombatParticipant | null {
  if (!candidate || candidate.speciesId === undefined || candidate.form === undefined || candidate.level === undefined) return null
  return { identity: `${candidate.speciesId}:${candidate.personality}:${candidate.trainerId}`, speciesId: candidate.speciesId, form: candidate.form, level: candidate.level,
    slot: candidate.slot ?? null, nickname: candidate.nickname, health: consistentBattleHealth(candidate, health), stages: consistentStatStages(candidate, stages) }
}
export function normalizeBlackBattle(snapshot: BlackBattleSnapshot) {
  return { status: snapshot.status, active: snapshot.battleActive ?? null, opponentRosterTotal: null,
    enemy: participant(consistentEnemyCandidate(snapshot.candidates), snapshot.enemyVitalsCandidates ?? [], snapshot.candidates),
    own: participant(consistentOwnCandidate(snapshot.activeCandidates ?? []), snapshot.activeCandidates ?? [], snapshot.activeCandidates ?? []),
    team: snapshot.battleTeam?.map(member => ({ ...(participant(member, [member, member], [member, member]) ?? {
      identity: `egg:${member.slot}`, speciesId: member.speciesId ?? 0, form: member.form ?? 0, level: member.level ?? null, slot: member.slot, health: null, stages: null,
    }), isEgg: member.isEgg })) ?? null }
}
