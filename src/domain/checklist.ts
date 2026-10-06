import type { EncounterSpecies } from '../models/encounters.ts'

// Only the Pokédex caught set: no party, collection, boxes or seen flags.
export function captureChecklist(encounters: readonly EncounterSpecies[], caughtSpeciesIds: ReadonlySet<number>) {
  const rows = encounters.map(encounter => ({ ...encounter, caught: caughtSpeciesIds.has(encounter.speciesId) }))
  return { rows, caught: rows.filter(row => row.caught).length, total: rows.length }
}
