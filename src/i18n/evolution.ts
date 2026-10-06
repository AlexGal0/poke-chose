import type { EvolutionFact } from '../domain/evolution.ts'
import { zoneLabel } from './zones.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function evolutionMethodLabel(t: T, facts: EvolutionFact[]): string {
  return facts.map(fact => {
    if (fact.key === 'evolutionMethod.location') {
      const locationId = fact.params!.locationId as number
      return t(fact.key, { zone: zoneLabel(t, { id: locationId, name: '' }) })
    }
    return t(fact.key, fact.params)
  }).join(' · ')
}
