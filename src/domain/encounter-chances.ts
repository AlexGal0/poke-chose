import type { BlackEncounterDetail } from '../models/encounters.ts'

export function encounterChances(details: readonly BlackEncounterDetail[]) {
  const groups = new Map<string, { key: string; area: string; method: string; conditions: string[]; chance: number }>()
  for (const detail of details) {
    if (detail.method === 'npc-trade' || typeof detail.chance !== 'number' || !Number.isFinite(detail.chance) || detail.chance < 0 || detail.chance > 100) continue
    const conditions = [...detail.conditions].sort()
    const key = JSON.stringify([detail.area, detail.method, conditions])
    const group = groups.get(key)
    if (group) group.chance = Math.min(100, group.chance + detail.chance)
    else groups.set(key, { key, area: detail.area, method: detail.method, conditions, chance: detail.chance })
  }
  return [...groups.values()].sort((a, b) => b.chance - a.chance)
}
