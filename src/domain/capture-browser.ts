import type { EncounterSpecies } from '../models/encounters.ts'
import type { PokedexState } from '../models/pokedex.ts'
import { captureChecklist } from './checklist.ts'
import { orderEncountersByLevel } from './encounter-levels.ts'
import { encounterSubzones } from './encounter-subzones.ts'
import { normalizeTag } from './collection-search.ts'

export type CaptureFilter = 'all' | 'pending' | 'caught' | 'seen'
export function filterCaptureProgress(rows: EncounterSpecies[], pokedex: PokedexState | null, filter: CaptureFilter) {
  if (!pokedex || filter === 'all') return rows
  return rows.filter(row => filter === 'caught' ? pokedex.caughtSpeciesIds.has(row.speciesId)
    : filter === 'pending' ? !pokedex.caughtSpeciesIds.has(row.speciesId)
      : pokedex.seenSpeciesIds.has(row.speciesId) && !pokedex.caughtSpeciesIds.has(row.speciesId))
}

export function filterCaptureMethods(input: readonly EncounterSpecies[], methods?: ReadonlySet<string>) {
  return input.flatMap(row => {
    const details = row.details.filter(detail => !methods || methods.has(detail.method))
    return details.length ? [{ ...row, details }] : []
  })
}

export function captureBrowserView(input: readonly EncounterSpecies[], options: {
  pokedex: PokedexState | null; methods?: ReadonlySet<string>; progress?: CaptureFilter; matches?: (row: EncounterSpecies) => boolean
}) {
  const accessible = filterCaptureMethods(input, options.methods)
  const rows = orderEncountersByLevel(filterCaptureProgress(accessible, options.pokedex, options.progress ?? 'all').filter(row => options.matches?.(row) ?? true))
  return { rows, accessibleRows: accessible, subzones: encounterSubzones(rows),
    checklist: options.pokedex ? captureChecklist(accessible, options.pokedex.caughtSpeciesIds) : null }
}

// The adapter supplies journey order and the searchable localized presentation.
export function captureZoneNavigation<Z extends { id: number }>(zones: readonly Z[], selected: number | undefined, query: string, searchText: (zone: Z) => string) {
  const words = normalizeTag(query.trim()).split(/\s+/).filter(Boolean)
  const matching = zones.filter(zone => words.every(word => normalizeTag(searchText(zone)).includes(word)))
  const navigation = zones.filter(zone => zone.id === selected || matching.includes(zone))
  const index = navigation.findIndex(zone => zone.id === selected)
  return { matching, navigation, index, previous: index > 0 ? navigation[index - 1] : null, next: index >= 0 ? navigation[index + 1] ?? null : null }
}
