import type { Stat } from '../domain/stats.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function statLabel(t: T, stat: Stat): string {
  return t(`statistics.stats.${stat}`)
}

export function statsFormLabel(t: T, form: string): string {
  return t(`statistics.forms.${form}`)
}
