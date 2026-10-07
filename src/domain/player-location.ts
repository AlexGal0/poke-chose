import type { EncounterLocation } from '../models/encounters.ts'
import { blackZoneLocations } from './black-zones.ts'
import { BLACK_MAP_ZONES } from './black-map-zones.ts'

// Derived from the IRBS revision 0 ROM name bank, not inferred from adjacent IDs.
const locations = new Map(blackZoneLocations().map(location => [location.id, location]))
const verifiedLocations = new Map<number, EncounterLocation>()
for (const [locationId, mapIds] of BLACK_MAP_ZONES) {
  const location = locations.get(locationId)
  if (location) for (const mapId of mapIds) verifiedLocations.set(mapId, location)
}

export function resolveBlackMapLocation(mapId: number): EncounterLocation | null {
  const location = verifiedLocations.get(mapId)
  return location ? { ...location } : null
}
