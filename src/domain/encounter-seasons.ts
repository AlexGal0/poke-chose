const seasons: Record<string, { label: string; icon: string }> = {
  'season-spring': { label: 'Primavera', icon: '🌸' },
  'season-summer': { label: 'Verano', icon: '☀️' },
  'season-autumn': { label: 'Otoño', icon: '🍂' },
  'season-winter': { label: 'Invierno', icon: '❄️' },
}

export function encounterSeasons(conditions: readonly string[]) {
  return [...new Set(conditions)].flatMap(condition => Object.hasOwn(seasons, condition) ? [{ condition, ...seasons[condition] }] : [])
}

export function encounterConditionLabel(condition: string): string {
  return Object.hasOwn(seasons, condition) ? seasons[condition].label : condition
}
