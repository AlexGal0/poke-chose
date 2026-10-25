import type { PlayerPosition } from '../../models/player-position.ts'
import { resolveBlackMapLocation } from '../../domain/player-location.ts'
import type { CaptureLocationReading } from '../../models/capture-location.ts'

export function blackCaptureLocation(source: 'manual' | 'save' | 'live', position: PlayerPosition | null, stale: boolean, enabled: boolean) {
  const detected = position ? resolveBlackMapLocation(position.mapId) : null
  const reading: CaptureLocationReading = { scope: `black:${source}`, available: enabled && source !== 'manual', zoneId: detected?.id ?? null, stale }
  return { detected, reading }
}
