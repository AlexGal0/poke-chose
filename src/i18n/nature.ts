import type { Nature } from '../domain/nature.ts'
import type { Stat } from '../domain/stats.ts'
import { statLabel } from './stats.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function natureLabel(t: T, nature: Nature): string {
  return t(`nature.names.${nature}`)
}

export function natureEffectLabel(t: T, effect: 'increased' | 'decreased', stat: Stat): string {
  return t(`nature.${effect}`, { stat: statLabel(t, stat) })
}
