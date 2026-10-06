import type { BattleStat } from '../domain/battle-stat-stages.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function battleStatLabel(t: T, stat: BattleStat): string {
  return t(`battleStatStages.stat.${stat}`)
}
