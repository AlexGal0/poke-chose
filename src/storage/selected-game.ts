import { GAME_PROFILES } from '../games/profiles.ts'
import type { GameId } from '../games/profiles.ts'

const KEY = 'poke-chose:selected-game:v1'
function localDay(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// A daily session survives reloads and browser restarts, but expires the next day.
export function loadSelectedGame(now = new Date()) {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!value || typeof value !== 'object' || !('day' in value) || value.day !== localDay(now) || !('game' in value)) return null
    return GAME_PROFILES.find(profile => profile.id === value.game) ?? null
  } catch { return null }
}

export function saveSelectedGame(game: GameId | null, now = new Date()) {
  try {
    if (game === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify({ game, day: localDay(now) }))
  } catch { /* Selection remains available for this running app when storage is blocked. */ }
}
