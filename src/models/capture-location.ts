// Already resolved encounter-zone IDs. Emulator map IDs never enter shared UI.
export interface CaptureLocationReading {
  scope: string
  available: boolean // Capability, not connection health; interruptions use stale.
  zoneId: number | null
  stale: boolean
}
export interface CaptureZoneSession { scope: string; zoneId: number | null }
