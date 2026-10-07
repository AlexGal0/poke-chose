import { persistValue } from './persist.ts'

const KEY = 'poke-chose:theme:v1'
export const THEMES = ['base', 'pokemon', 'pokemon-dark', 'fiesta', 'gameboy-color', 'aqua-2000'] as const
export type Theme = typeof THEMES[number]

export function loadTheme(): Theme {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return THEMES.find(theme => theme === value) ?? 'base'
  } catch { return 'base' }
}

export function saveTheme(theme: Theme): boolean {
  return persistValue(KEY, JSON.stringify(theme))
}
