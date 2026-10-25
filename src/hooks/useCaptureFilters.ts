import { useState } from 'react'
import type { CaptureFilter } from '../domain/capture-browser'

// Manual and future automatic transitions have the same filter-reset policy.
export function useCaptureFilters(zoneId: number | undefined) {
  const [stored, setStored] = useState({ zoneId, query: '', method: 'all', progress: 'all' as CaptureFilter })
  const current = stored.zoneId === zoneId ? stored : { ...stored, zoneId, query: '', method: 'all' }
  if (current !== stored) setStored(current)
  return { query: current.query, method: current.method, progress: current.progress,
    setQuery: (query: string) => setStored(previous => ({ ...previous, query })),
    setMethod: (method: string) => setStored(previous => ({ ...previous, method })),
    setProgress: (progress: CaptureFilter) => setStored(previous => ({ ...previous, progress })),
  }
}
