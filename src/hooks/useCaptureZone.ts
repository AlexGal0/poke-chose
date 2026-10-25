import { useState } from 'react'
import type { CaptureLocationReading, CaptureZoneSession } from '../models/capture-location'
import { advanceCaptureZone } from '../domain/capture-location'

export function useCaptureZone({ reading, validZone, loadManual, saveManual, loadFollow, saveFollow }: {
  reading: CaptureLocationReading; validZone: (id: number) => boolean
  loadManual: () => number | undefined; saveManual: (id: number) => boolean
  loadFollow: () => boolean; saveFollow: (enabled: boolean) => boolean
}) {
  const [manual, setManual] = useState(loadManual)
  const [follow, updateFollow] = useState(loadFollow)
  const [zoneSaved, setZoneSaved] = useState(true)
  const [followSaved, setFollowSaved] = useState(true)
  const [session, setSession] = useState<CaptureZoneSession>({ scope: reading.scope, zoneId: null })
  const next = advanceCaptureZone(session, reading, follow, validZone)
  if (next.scope !== session.scope || next.zoneId !== session.zoneId) setSession(next)
  function setFollow(enabled: boolean) {
    const value = enabled && reading.available
    updateFollow(value)
    setFollowSaved(saveFollow(value))
  }
  function selectZone(id: number) {
    if (!validZone(id)) return
    setFollow(false)
    setManual(id)
    setZoneSaved(saveManual(id))
  }
  return { selected: follow && reading.available ? next.zoneId ?? manual : manual, follow, setFollow, selectZone, zoneSaved, followSaved }
}
