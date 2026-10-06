import type { CollectionState, Pokemon } from '../models/pokemon.ts'

export function addToCollection(state: CollectionState, pokemon: Pokemon): CollectionState {
  return state.collection.some(p => p.id === pokemon.id) ? state : { ...state, collection: [...state.collection, pokemon] }
}

export function removeFromCollection(state: CollectionState, id: number): CollectionState {
  return { collection: state.collection.filter(p => p.id !== id), teamIds: state.teamIds.filter(member => member !== id) }
}

export function toggleTeamMember(state: CollectionState, id: number): CollectionState {
  if (state.teamIds.includes(id)) return { ...state, teamIds: state.teamIds.filter(member => member !== id) }
  if (state.teamIds.length >= 6 || !state.collection.some(p => p.id === id)) return state
  return { ...state, teamIds: [...state.teamIds, id] }
}
