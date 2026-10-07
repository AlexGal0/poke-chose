export type LocationSource = 'manual' | 'save' | 'live'
export interface FollowedZone { source: LocationSource; id: number | null }

export function nextFollowedZone(previous: FollowedZone, source: LocationSource, follow: boolean, freshZone: number | null): FollowedZone {
  if (!follow || source === 'manual') return { source, id: null }
  return { source, id: freshZone ?? (previous.source === source ? previous.id : null) }
}
