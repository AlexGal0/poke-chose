import { TYPES } from '../models/pokemon.ts'
import { persistValue } from './persist.ts'
import type { CollectionState, Pokemon } from '../models/pokemon.ts'

const KEY = 'poke-chose:bw:v1'
const empty = (): CollectionState => ({ collection: [], teamIds: [] })

export function isPokemon(value: unknown): value is Pokemon {
  if (!value || typeof value !== 'object') return false
  const pokemon = value as Pokemon
  return Number.isInteger(pokemon.id) && pokemon.id >= 1 && pokemon.id <= 649 &&
    typeof pokemon.name === 'string' && pokemon.name.length > 0 &&
    (pokemon.nickname == null || (typeof pokemon.nickname === 'string' && pokemon.nickname.length <= 10)) &&
    (pokemon.sprite === null || (typeof pokemon.sprite === 'string' && pokemon.sprite.startsWith('https://raw.githubusercontent.com/PokeAPI/sprites/'))) &&
    Array.isArray(pokemon.types) && pokemon.types.length >= 1 && pokemon.types.length <= 2 &&
    new Set(pokemon.types).size === pokemon.types.length && pokemon.types.every(type => TYPES.includes(type))
}

export function decodeState(raw: string | null): CollectionState {
  if (!raw) return empty()
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data.collection) || !Array.isArray(data.teamIds)) return empty()
    const collection: Pokemon[] = data.collection.filter(isPokemon)
      .filter((pokemon: Pokemon, index: number, all: Pokemon[]) => all.findIndex(p => p.id === pokemon.id) === index)
    const teamIds = [...new Set<number>(data.teamIds.filter((id: unknown) => typeof id === 'number' && collection.some(p => p.id === id)))].slice(0, 6)
    return { collection, teamIds }
  } catch { return empty() }
}

export function loadState(): CollectionState {
  try { return decodeState(localStorage.getItem(KEY)) } catch { return empty() }
}

export function saveState(state: CollectionState): boolean {
  return persistValue(KEY, JSON.stringify(state))
}

export function readCache<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(`poke-chose:cache:${key}`) ?? 'null') as T | null } catch { return null }
}

export function writeCache(key: string, value: unknown) {
  try { localStorage.setItem(`poke-chose:cache:${key}`, JSON.stringify(value)) } catch { /* Cache is optional. */ }
}
