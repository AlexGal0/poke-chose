import type { EncounterAccess } from '../domain/encounter-access.ts'
import { persistValue } from './persist.ts'

const KEY = 'poke-chose:black:encounter-access:v1'

export function loadEncounterAccess(): EncounterAccess {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return { surf: value?.surf === true, superRod: value?.superRod === true }
  } catch { return { surf: false, superRod: false } }
}

export function saveEncounterAccess(access: EncounterAccess): boolean {
  return persistValue(KEY, JSON.stringify(access))
}
