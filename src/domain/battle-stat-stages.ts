import type { EnemyCandidate } from './enemy-prototype.ts'

export const BATTLE_STAT_LABELS = {
  attack: 'Ataque',
  defense: 'Defensa',
  specialAttack: 'Ataque esp.',
  specialDefense: 'Defensa esp.',
  speed: 'Velocidad',
  accuracy: 'Precisión',
  evasion: 'Evasión',
} as const

export type BattleStat = keyof typeof BATTLE_STAT_LABELS
export type BattleStatStages = Record<BattleStat, number>
export const BATTLE_STATS = Object.keys(BATTLE_STAT_LABELS) as BattleStat[]

export const BATTLE_STAT_SHORT_LABELS: Record<BattleStat, string> = {
  attack: 'ATK', defense: 'DEF', specialAttack: 'SPA', specialDefense: 'SPD', speed: 'SPE', accuracy: 'ACC', evasion: 'EVA',
}

export interface StatStagesDisplay { identity: string; stages: BattleStatStages | null }

export function updateStatStagesDisplay(previous: StatStagesDisplay, identity: string, stages: BattleStatStages | null): StatStagesDisplay {
  if (previous.identity !== identity) return { identity, stages }
  if (stages && stages !== previous.stages) return { identity, stages }
  return previous
}

export function validStatStages(value: unknown): value is BattleStatStages {
  if (!value || typeof value !== 'object') return false
  const stages = value as BattleStatStages
  return BATTLE_STATS.every(stat => Number.isInteger(stages[stat]) && stages[stat] >= -6 && stages[stat] <= 6)
}

export function consistentStatStages(candidate: EnemyCandidate | null, readings: EnemyCandidate[]): BattleStatStages | null {
  if (!candidate || readings.length < 2) return null
  const first = readings[0].statStages
  if (!validStatStages(first)) return null
  return readings.every(reading => reading.speciesId === candidate.speciesId && reading.form === candidate.form &&
    reading.level === candidate.level && reading.personality === candidate.personality && reading.trainerId === candidate.trainerId &&
    validStatStages(reading.statStages) && BATTLE_STATS.every(stat => reading.statStages![stat] === first[stat])) ? first : null
}
