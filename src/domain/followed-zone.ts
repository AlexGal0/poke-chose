import { advanceCaptureZone } from './capture-location.ts'

export type LocationSource = 'manual' | 'save' | 'live'
export interface FollowedZone { source: LocationSource; id: number | null }

export function nextFollowedZone(previous: FollowedZone, source: LocationSource, follow: boolean, freshZone: number | null): FollowedZone {
  const next = advanceCaptureZone({ scope: previous.source, zoneId: previous.id }, { scope: source, available: source !== 'manual', zoneId: freshZone, stale: false }, follow, () => true)
  return { source, id: next.zoneId }
}

