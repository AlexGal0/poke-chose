import type { EncounterSpecies } from '../models/encounters.ts'

export function minimumEncounterLevel(row: EncounterSpecies): number | null {
  const levels = row.details.map(detail => detail.minLevel).filter(level => Number.isInteger(level) && level >= 1 && level <= 100)
  return levels.length ? Math.min(...levels) : null
}

export function orderEncountersByLevel(rows: readonly EncounterSpecies[]): EncounterSpecies[] {
  return [...rows].sort((a, b) => (minimumEncounterLevel(a) ?? Infinity) - (minimumEncounterLevel(b) ?? Infinity) || a.speciesId - b.speciesId)
}
