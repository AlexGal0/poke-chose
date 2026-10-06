import { persistValue } from './persist.ts'

const KEY = 'poke-chose:locale:v1'
export const LOCALES = ['es', 'en'] as const
export type Locale = typeof LOCALES[number]

export function loadLocale(): Locale {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return LOCALES.find(locale => locale === value) ?? 'es'
  } catch { return 'es' }
}

export function saveLocale(locale: Locale): boolean {
  return persistValue(KEY, JSON.stringify(locale))
}
