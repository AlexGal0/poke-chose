import type { CaptureLocationReading, CaptureZoneSession } from '../models/capture-location.ts'

export function advanceCaptureZone(previous: CaptureZoneSession, reading: CaptureLocationReading, follow: boolean, validZone: (id: number) => boolean): CaptureZoneSession {
  if (!follow || !reading.available) return { scope: reading.scope, zoneId: null }
  const confirmed = !reading.stale && reading.zoneId !== null && Number.isInteger(reading.zoneId) && reading.zoneId > 0 && validZone(reading.zoneId)
  return { scope: reading.scope, zoneId: confirmed ? reading.zoneId : previous.scope === reading.scope ? previous.zoneId : null }
}
