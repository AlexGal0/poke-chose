import { persistValue } from './persist.ts'

const KEY = 'poke-chose:black:follow-location:v1'

export function loadFollowLocation(): boolean {
  try { return localStorage.getItem(KEY) === 'true' } catch { return false }
}

export function saveFollowLocation(enabled: boolean): boolean {
  return persistValue(KEY, JSON.stringify(enabled))
}
