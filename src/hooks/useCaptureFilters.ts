import { useEffect, useMemo, useState } from 'react'
import type { CaptureFilter } from '../domain/capture-browser'
import { loadCaptureFilters, saveCaptureFilters } from '../storage/capture-filters'
import type { CapturePreferences } from '../storage/capture-filters'

// Keep each zone's search/method, with game-scoped progress and zone search.
export function useCaptureFilters(zoneId: number | undefined, storageKey: string) {
  const [stored, setStored] = useState(() => ({ ...loadCaptureFilters(storageKey, zoneId), storageKey }))
  const current = useMemo(() => stored.storageKey === storageKey && stored.zoneId === zoneId ? stored : { ...loadCaptureFilters(storageKey, zoneId), storageKey }, [stored, storageKey, zoneId])
  if (current !== stored) setStored(current)
  const [saved, setSaved] = useState(true)
  useEffect(() => { saveCaptureFilters(storageKey, current) }, [storageKey, current])
  function update(value: Partial<CapturePreferences>) {
    const next = { ...current, ...value }
    setStored(next)
    setSaved(saveCaptureFilters(storageKey, next))
  }
  return { query: current.query, method: current.method, progress: current.progress, zoneQuery: current.zoneQuery, saved,
    setQuery: (query: string) => update({ query }),
    setMethod: (method: string) => update({ method }),
    setProgress: (progress: CaptureFilter) => update({ progress }),
    setZoneQuery: (zoneQuery: string) => update({ zoneQuery }),
  }
}
