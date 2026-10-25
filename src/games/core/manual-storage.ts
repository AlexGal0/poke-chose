import { persistValue } from '../../storage/persist.ts'
import type { CollectionState } from '../../models/pokemon.ts'
import { isManualPokemon } from './catalog.ts'
import type { CatalogRules, ManualPokemon } from './catalog.ts'

export function decodeManualCollection(raw: string | null, rules: CatalogRules): CollectionState<ManualPokemon> {
  const empty = (): CollectionState<ManualPokemon> => ({ collection: [], teamIds: [] })
  try {
    const value = JSON.parse(raw ?? 'null')
    if (!value || !Array.isArray(value.collection) || !Array.isArray(value.teamIds)) return empty()
    const collection: ManualPokemon[] = value.collection.filter((p: unknown) => isManualPokemon(p, rules))
      .filter((p: ManualPokemon, index: number, all: ManualPokemon[]) => all.findIndex(row => row.id === p.id) === index)
    const teamIds = [...new Set<number>(value.teamIds.filter((id: unknown) => typeof id === 'number' && collection.some(p => p.id === id)))].slice(0, 6)
    return { collection, teamIds }
  } catch { return empty() }
}

export function createManualStorage(rules: CatalogRules) {
  const key = `poke-chose:${rules.id}:manual:v1`
  return {
    load(): CollectionState<ManualPokemon> {
      try { return decodeManualCollection(localStorage.getItem(key), rules) } catch { return { collection: [], teamIds: [] } }
    },
    save(state: CollectionState<ManualPokemon>): boolean { return persistValue(key, JSON.stringify(state)) },
  }
}
