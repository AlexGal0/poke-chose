import type { CollectionState } from '../models/pokemon.ts'

export function addToCollection<T extends { id: number }>(state: CollectionState<T>, pokemon: T): CollectionState<T> {
  return state.collection.some(p => p.id === pokemon.id) ? state : { ...state, collection: [...state.collection, pokemon] }
}

export function removeFromCollection<T extends { id: number }>(state: CollectionState<T>, id: number): CollectionState<T> {
  return { collection: state.collection.filter(p => p.id !== id), teamIds: state.teamIds.filter(member => member !== id) }
}

export function toggleTeamMember<T extends { id: number }>(state: CollectionState<T>, id: number): CollectionState<T> {
  if (state.teamIds.includes(id)) return { ...state, teamIds: state.teamIds.filter(member => member !== id) }
  if (state.teamIds.length >= 6 || !state.collection.some(p => p.id === id)) return state
  return { ...state, teamIds: [...state.teamIds, id] }
}
