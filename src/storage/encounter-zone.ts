const KEY = 'poke-chose:black:encounter-zone:v1'
const DEFAULT_ZONE = 358

function validZone(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 346 && value <= 428 && value !== 393 && value !== 425
}

export function loadEncounterZone(): number {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return validZone(value) ? value : DEFAULT_ZONE
  } catch { return DEFAULT_ZONE }
}

export function saveEncounterZone(id: number): boolean {
  if (!validZone(id)) return false
  return persistValue(KEY, JSON.stringify(id))
}
import { persistValue } from './persist.ts'
