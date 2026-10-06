import type { EncounterLocation } from '../models/encounters.ts'

// Observed in Black saves and confirmed by the player. See the development log.
// Add interiors/floors only after verification; adjacent IDs imply no relationship.
const verifiedLocations = new Map<number, EncounterLocation>([
  [331, { id: 361, name: 'unova-route-6' }],
])

export function resolveBlackMapLocation(mapId: number): EncounterLocation | null {
  const location = verifiedLocations.get(mapId)
  return location ? { ...location } : null
}
