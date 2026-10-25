import type { ExperienceLevel } from '../../api/experience.ts'
import type { IndividualGender } from '../../domain/gender.ts'

// A source normalizes its stored/gained experience into a current total.
export interface DaycarePokemon {
  speciesId: number
  form: number
  nickname?: string | null
  gender?: IndividualGender
  experience: number
}
export interface DaycareReading {
  available: boolean
  stale: boolean
  data: { slots: readonly (DaycarePokemon | null)[]; eggAvailable: boolean } | null
}
export type DaycareData = NonNullable<DaycareReading['data']>

// Transport limits come from the selected game, never from a shared Gen V default.
export function isDaycareData(value: unknown, maxSpecies: number, nicknameLength: number): value is DaycareData {
  if (!value || typeof value !== 'object') return false
  const data = value as DaycareData
  return typeof data.eggAvailable === 'boolean' && Array.isArray(data.slots) && data.slots.length === 2 &&
    data.slots.every(member => member === null || (member && typeof member === 'object' &&
      Number.isInteger(member.speciesId) && member.speciesId >= 1 && member.speciesId <= maxSpecies &&
      Number.isInteger(member.form) && member.form >= 0 && member.form <= 31 &&
      Number.isInteger(member.experience) && member.experience >= 0 && member.experience <= 0xffffffff &&
      (member.gender === undefined || ['male', 'female', 'genderless'].includes(member.gender)) &&
      (member.nickname == null || typeof member.nickname === 'string' && member.nickname.length <= nicknameLength &&
        member.nickname.trim().length > 0 && [...member.nickname].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127))))
}
export interface DaycareService {
  resolve(speciesId: number, form: number, signal?: AbortSignal): Promise<{ name: string; sprite: string | null }>
  experienceLevels(speciesId: number, signal?: AbortSignal): Promise<ExperienceLevel[]>
  evolutionLevel(speciesId: number, signal?: AbortSignal): Promise<number | null>
}
