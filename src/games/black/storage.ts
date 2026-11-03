import type { ManualCollectionStorage } from '../core/manual-storage.ts'
import { blackSpeciesScope } from './catalog.ts'
import { loadState, saveState } from '../../storage/local.ts'
import { isPokemon } from '../../storage/local.ts'
import type { CollectionState } from '../../models/pokemon.ts'
import type { ManualPokemon } from '../core/catalog.ts'

// Retain the original key and validation: migration must not reset manual data.
export const blackManualStorage: ManualCollectionStorage = {
  load: () => { const state = loadState(); return { ...state, collection: state.collection.map(pokemon => ({ ...pokemon, scope: blackSpeciesScope(pokemon.id) })) } },
  save(state: CollectionState<ManualPokemon>) {
    if (!state.collection.every(isPokemon)) return false
    return saveState({ collection: state.collection, teamIds: state.teamIds })
  },
}
