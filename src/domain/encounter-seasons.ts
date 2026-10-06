// Labels live in the encounterSeasons.* translation keys; this file only
// carries icons and which conditions are known seasons, so it stays
// locale-free.
const seasonIcons: Record<string, string> = {
  'season-spring': '🌸',
  'season-summer': '☀️',
  'season-autumn': '🍂',
  'season-winter': '❄️',
}

export function isKnownSeason(condition: string): boolean {
  return Object.hasOwn(seasonIcons, condition)
}

export function encounterSeasons(conditions: readonly string[]) {
  return [...new Set(conditions)].flatMap(condition => isKnownSeason(condition) ? [{ condition, icon: seasonIcons[condition] }] : [])
}
