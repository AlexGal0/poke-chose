import type { EncounterLocation } from '../models/encounters.ts'

// Observed in Black saves/live memory and confirmed by the player. See the log.
// Add interiors/floors only after verification; adjacent IDs imply no relationship.
const verifiedLocations = new Map<number, EncounterLocation>([
  [96, { id: 352, name: 'driftveil-city' }],
  [99, { id: 352, name: 'driftveil-city' }], // Pokémon Center interior.
  [331, { id: 361, name: 'unova-route-6' }],
  [332, { id: 361, name: 'unova-route-6' }], // Season Research Lab interior.
])

export function resolveBlackMapLocation(mapId: number): EncounterLocation | null {
  const location = verifiedLocations.get(mapId)
  return location ? { ...location } : null
}
