import type { EvolutionDetail } from '../models/evolution.ts'

// Only unconditional level evolutions have a meaningful numeric countdown.
export function evolutionLevelsRemaining(methods: EvolutionDetail[], level: number | null | undefined): number | null {
  if (level == null || !Number.isInteger(level) || level < 1 || level > 100) return null
  const levels = methods.filter(method => method.trigger.name === 'level-up' &&
    Object.entries(method).every(([key, value]) => ['trigger', 'min_level', 'version_group', 'is_default'].includes(key) ||
      value == null || value === false || value === '')).map(method => method.min_level)
    .filter((value): value is number => value != null && Number.isInteger(value) && value >= 1 && value <= 100)
  return levels.length ? Math.max(0, Math.min(...levels) - level) : null
}
