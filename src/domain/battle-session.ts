import { consistentEnemyCandidate, consistentOwnCandidate } from './enemy-prototype.ts'
import type { EnemyCandidate, ActivePokemonCandidate, BattleTeamMember } from './enemy-prototype.ts'
import { advanceCombatSession } from './battle-lifecycle.ts'

export interface BattleReading {
  status: string
  candidates: EnemyCandidate[]
  activeCandidates?: ActivePokemonCandidate[]
  battleTeam?: BattleTeamMember[] | null
  battleActive?: boolean | null
}

export interface BattleSession {
  inBattle: boolean
  enemy: EnemyCandidate | null
  own: ActivePokemonCandidate | null
  team: BattleTeamMember[] | null
}

export function emptyBattleSession(): BattleSession {
  return { inBattle: false, enemy: null, own: null, team: null }
}

export function updateBattleSession(previous: BattleSession, reading: BattleReading): BattleSession {
  return advanceCombatSession(previous, { status: reading.status, active: reading.battleActive ?? null,
    enemy: consistentEnemyCandidate(reading.candidates), own: consistentOwnCandidate(reading.activeCandidates ?? []), team: reading.battleTeam ?? null })
}
