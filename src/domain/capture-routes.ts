import type { EncounterDetail } from '../models/encounters.ts'
import { encounterChances } from './encounter-chances.ts'

// Keep tables/conditions independent and retain gaps between actual level ranges.
export function captureRoutes(details: readonly EncounterDetail[]) {
  const chances = new Map(encounterChances(details).map(group => [group.key, group.chance]))
  const groups = new Map<string, { key: string; method: string; area: string; conditions: string[]; chance: number | null; levels: { min: number; max: number }[] }>()
  for (const detail of details) {
    const conditions = [...detail.conditions].sort()
    const key = JSON.stringify([detail.area, detail.method, conditions])
    let group = groups.get(key)
    if (!group) {
      group = { key, method: detail.method, area: detail.area, conditions, chance: chances.get(key) ?? null, levels: [] }
      groups.set(key, group)
    }
    if (Number.isInteger(detail.minLevel) && Number.isInteger(detail.maxLevel) && detail.minLevel > 0 && detail.maxLevel >= detail.minLevel) group.levels.push({ min: detail.minLevel, max: detail.maxLevel })
  }
  return [...groups.values()].map(group => {
    const levels: { min: number; max: number }[] = []
    for (const range of group.levels.sort((a, b) => a.min - b.min || a.max - b.max)) {
      const previous = levels.at(-1)
      if (previous && range.min <= previous.max + 1) previous.max = Math.max(previous.max, range.max)
      else levels.push({ ...range })
    }
    return { ...group, levels }
  })
}
