import type { EncounterLocation, EncounterSpecies, BlackEncounterDetail } from '../models/encounters.ts'
import { orderBlackZones } from './black-zones.ts'

export interface ZoneEncounters { location: EncounterLocation; rows: EncounterSpecies[] }
export const naturalMethods = new Set(['walk', 'dark-grass', 'grass-spots', 'cave-spots', 'bridge-spots', 'surf', 'surf-spots', 'super-rod', 'super-rod-spots', 'old-rod', 'good-rod', 'rock-smash', 'headbutt', 'roaming-grass', 'roaming-water'])
const signature = (detail: BlackEncounterDetail) => JSON.stringify([detail.method, [...detail.conditions].sort()])
const valid = (detail: BlackEncounterDetail): detail is BlackEncounterDetail & { chance: number } => naturalMethods.has(detail.method) && typeof detail.chance === 'number' && Number.isFinite(detail.chance) && detail.chance >= 0 && detail.chance <= 100

export function encounterOpportunity(speciesId: number, currentId: number, details: BlackEncounterDetail[], zones: ZoneEncounters[]) {
  const occurrences = zones.filter(zone => zone.rows.some(row => row.speciesId === speciesId && row.details.some(detail => naturalMethods.has(detail.method))))
  if (occurrences.length === 1 && occurrences[0].location.id === currentId) return { kind: 'unique' as const }
  const order = orderBlackZones(zones.map(zone => zone.location))
  const currentIndex = order.findIndex(zone => zone.id === currentId)
  if (currentIndex < 0) return { kind: 'other' as const }
  const maxima = new Map<string, number>()
  for (const detail of details.filter(valid)) maxima.set(signature(detail), Math.max(maxima.get(signature(detail)) ?? 0, detail.chance))
  const alternatives = occurrences.flatMap(zone => {
    if (order.findIndex(location => location.id === zone.location.id) <= currentIndex) return []
    return zone.rows.filter(row => row.speciesId === speciesId).flatMap(row => row.details.filter(valid).flatMap(detail => {
      const current = maxima.get(signature(detail))
      return current !== undefined && detail.chance > current ? [{ location: zone.location, method: detail.method, conditions: detail.conditions, current, chance: detail.chance }] : []
    }))
  }).sort((a, b) => b.chance - a.chance)
  return alternatives.length ? { kind: 'later' as const, alternatives } : { kind: 'other' as const }
}
