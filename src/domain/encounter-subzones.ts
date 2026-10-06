import type { EncounterSpecies } from '../models/encounters.ts'
import { orderEncountersByLevel } from './encounter-levels.ts'

export function encounterSubzones(rows: readonly EncounterSpecies[]) {
  const groups = new Map<string, EncounterSpecies[]>()
  for (const row of rows) {
    for (const area of new Set(row.details.map(detail => detail.area))) {
      const species = { ...row, details: row.details.filter(detail => detail.area === area) }
      const group = groups.get(area)
      if (group) group.push(species)
      else groups.set(area, [species])
    }
  }
  return [...groups].map(([area, species]) => ({ area, rows: orderEncountersByLevel(species) }))
}
