import type { CaptureLocationReading } from '../../models/capture-location.ts'
import type { LivePartySnapshot } from '../../sources/live-party-snapshot.ts'
import maps from '../x/data/map-zones.json' with { type: 'json' }

const zones = new Map(maps.maps.map(row => [row.mapId, row.zoneId]))
export function resolveYMapZone(mapId: number): number | null {
  return Number.isInteger(mapId) ? zones.get(mapId) ?? null : null
}

// Only the live source advertises validated location reads. Saves never imply a current zone.
export function yCaptureLocation(source: 'manual' | 'save' | 'live', snapshot?: Pick<LivePartySnapshot, 'position' | 'capabilities' | 'status' | 'enabled'>): CaptureLocationReading {
  const available = source === 'live' && snapshot?.capabilities.location === true
  return { scope: `y:${source}`, available, zoneId: available && snapshot?.position ? resolveYMapZone(snapshot.position.mapId) : null,
    stale: !available || !snapshot?.enabled || snapshot.status !== 'ready' || snapshot.position == null }
}
