import type { CaptureFilter } from '../domain/capture-browser.ts'
import { persistValue } from './persist.ts'

export interface CapturePreferences { zoneId?: number; query: string; method: string; progress: CaptureFilter; zoneQuery: string }
export function loadCaptureFilters(key: string, zoneId?: number): CapturePreferences {
  const defaults: CapturePreferences = { zoneId, query: '', method: 'all', progress: 'all', zoneQuery: '' }
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (!value || typeof value !== 'object') return defaults
    const zone = value.zones?.[String(zoneId)] ?? (value.zoneId === zoneId ? value : {})
    return { zoneId, query: typeof zone.query === 'string' ? zone.query : '', method: typeof zone.method === 'string' && /^[a-z-]+$/.test(zone.method) ? zone.method : 'all', progress: ['all', 'pending', 'caught', 'seen'].includes(value.progress) ? value.progress : 'all', zoneQuery: typeof value.zoneQuery === 'string' ? value.zoneQuery : '' }
  } catch { return defaults }
}
export function saveCaptureFilters(key: string, value: CapturePreferences): boolean {
  let previous
  try { previous = JSON.parse(localStorage.getItem(key) ?? 'null') } catch { /* Optional storage. */ }
  return persistValue(key, JSON.stringify({ progress: value.progress, zoneQuery: value.zoneQuery, zones: { ...(previous?.zones ?? {}), [String(value.zoneId)]: { query: value.query, method: value.method } } }))
}
