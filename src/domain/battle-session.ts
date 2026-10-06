import { consistentEnemyCandidate, consistentOwnCandidate } from './enemy-prototype.ts'
import type { EnemyCandidate, ActivePokemonCandidate, BattleTeamMember } from './enemy-prototype.ts'

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
  if (reading.status !== 'ready') return previous
  // A missing opponent is common during attacks and trainer replacements.
  // Leave only when the reader confirms that both battle tables were released.
  if (reading.battleActive === false) return emptyBattleSession()
  const enemy = consistentEnemyCandidate(reading.candidates)
  const own = consistentOwnCandidate(reading.activeCandidates ?? [])
  if (!previous.inBattle && !enemy && reading.battleActive !== true) return previous
  return {
    inBattle: true,
    enemy: enemy ?? previous.enemy,
    own: own ?? previous.own,
    team: reading.battleTeam ?? previous.team,
  }
}
