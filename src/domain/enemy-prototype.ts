import type { BattleStatStages } from './battle-stat-stages.ts'

export interface EnemyCandidate {
  address: string
  speciesId?: number
  form?: number
  level?: number
  personality?: number
  trainerId?: number
  currentHp?: number
  maxHp?: number
  statStages?: BattleStatStages
}

export interface BattleHealth { currentHp: number; maxHp: number }

export function consistentBattleHealth(candidate: EnemyCandidate | null, readings: EnemyCandidate[]): BattleHealth | null {
  if (!candidate || readings.length < 2) return null
  const first = readings[0]
  if (!Number.isInteger(first.currentHp) || !Number.isInteger(first.maxHp) || first.currentHp! < 0 || first.maxHp! <= 0 || first.currentHp! > first.maxHp!) return null
  return readings.every(reading => reading.speciesId === candidate.speciesId && reading.form === candidate.form && reading.level === candidate.level &&
    reading.personality === candidate.personality && reading.trainerId === candidate.trainerId && reading.currentHp === first.currentHp && reading.maxHp === first.maxHp)
    ? { currentHp: first.currentHp!, maxHp: first.maxHp! } : null
}

export interface ActivePokemonCandidate extends EnemyCandidate {
  slot?: number
  nickname?: string | null
  battleSlot?: number
}

export interface BattleTeamMember extends ActivePokemonCandidate {
  slot: number
  isEgg: boolean
}

// The observed battle copies disappear on escape while encounter copies persist.
// Require agreement of every observed copy; never fall back to the stale subset.
export function consistentEnemyCandidate(candidates: EnemyCandidate[]): EnemyCandidate | null {
  if (candidates.length < 2) return null
  const first = candidates[0]
  if (!Number.isInteger(first.speciesId) || first.speciesId! < 1 || first.speciesId! > 649 ||
    !Number.isInteger(first.form) || first.form! < 0 || first.form! > 31 ||
    !Number.isInteger(first.level) || first.level! < 1 || first.level! > 100 ||
    !Number.isInteger(first.personality) || !Number.isInteger(first.trainerId)) return null
  return candidates.every(candidate => candidate.speciesId === first.speciesId && candidate.form === first.form &&
    candidate.level === first.level && candidate.personality === first.personality && candidate.trainerId === first.trainerId) ? first : null
}

export function consistentActiveCandidate(enemyCandidates: EnemyCandidate[], activeCandidates: ActivePokemonCandidate[]): ActivePokemonCandidate | null {
  if (!consistentEnemyCandidate(enemyCandidates)) return null
  return consistentOwnCandidate(activeCandidates)
}

export function consistentOwnCandidate(activeCandidates: ActivePokemonCandidate[]): ActivePokemonCandidate | null {
  if (!consistentEnemyCandidate(activeCandidates)) return null
  const first = activeCandidates[0]
  if (!Number.isInteger(first.battleSlot) || first.battleSlot! < 0 || first.battleSlot! > 5 || !activeCandidates.every(candidate => candidate.battleSlot === first.battleSlot)) return null
  if (!Number.isInteger(first.slot) || first.slot! < 0 || first.slot! > 5 || !activeCandidates.every(candidate => candidate.slot === first.slot)) return null
  return first
}
