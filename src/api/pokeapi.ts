import { TYPES } from '../models/pokemon.ts'
import type { CatalogEntry, Pokemon, PokemonType } from '../models/pokemon.ts'
import { isPokemon, readCache, writeCache } from '../storage/local.ts'
import { pokemonSpeciesName } from '../domain/pokemon-names.ts'

const BASE = 'https://pokeapi.co/api/v2'
type TypeSlot = { slot: number; type: { name: string } }
export interface PokemonResponse {
  id: number
  name: string
  species?: { name: string }
  types: TypeSlot[]
  past_types: { generation: { name: string }; types: TypeSlot[] }[]
  sprites: { versions: { 'generation-v': { 'black-white': { front_default: string | null } } } }
}

export function localizedName(names: { name: string; language: { name: string } }[], locale: string): string | undefined {
  return names.find(entry => entry.language.name === locale)?.name ?? names.find(entry => entry.language.name === 'en')?.name
}

export async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(15000)
  const response = await fetch(`${BASE}/${path}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!response.ok) throw new Error('No se pudo consultar PokéAPI. Intenta de nuevo.')
  return response.json() as Promise<T>
}

const generations = ['generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v', 'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix']

export function pokemonFromResponse(data: PokemonResponse, speciesId = data.id): Pokemon {
  // past_types describes types up to and including its generation.
  const past = data.past_types.filter(entry => generations.indexOf(entry.generation.name) >= 4)
    .sort((a, b) => generations.indexOf(a.generation.name) - generations.indexOf(b.generation.name))[0]
  const types = [...(past?.types ?? data.types)].sort((a, b) => a.slot - b.slot).map(entry => entry.type.name)
  if (speciesId < 1 || speciesId > 649 || !types.every(type => TYPES.includes(type as PokemonType))) {
    throw new Error('Este Pokémon no pertenece al catálogo de Black/White.')
  }
  return { id: speciesId, name: data.id <= 649 ? pokemonSpeciesName(data.species?.name ?? data.name) : data.name, types: types as PokemonType[], sprite: data.sprites.versions['generation-v']['black-white'].front_default }
}

export async function getCatalog(signal?: AbortSignal): Promise<CatalogEntry[]> {
  const cached = readCache<CatalogEntry[]>('catalog-v1')
  if (Array.isArray(cached) && cached.length === 649 && cached.every(p => Number.isInteger(p.id) && p.id >= 1 && p.id <= 649 && typeof p.name === 'string')) return cached.map(entry => ({ ...entry, name: pokemonSpeciesName(entry.name) }))
  const data = await request<{ results: { name: string; url: string }[] }>('pokemon-species?limit=649', signal)
  const catalog = data.results.map(p => ({ id: Number(p.url.split('/').filter(Boolean).at(-1)), name: p.name }))
  writeCache('catalog-v1', catalog)
  return catalog
}

export async function getPokemon(id: number, signal?: AbortSignal): Promise<Pokemon> {
  const cached = readCache<Pokemon>(`pokemon-bw-v1-${id}`)
  if (isPokemon(cached) && cached.id === id) return { ...cached, name: pokemonSpeciesName(cached.name) }
  const pokemon = pokemonFromResponse(await request<PokemonResponse>(`pokemon/${id}`, signal))
  writeCache(`pokemon-bw-v1-${id}`, pokemon)
  return pokemon
}

// PK5 form indices -> PokéAPI varieties for Gen V forms whose types differ.
const typedForms: Record<number, string[]> = {
  351: ['castform', 'castform-sunny', 'castform-rainy', 'castform-snowy'],
  413: ['wormadam-plant', 'wormadam-sandy', 'wormadam-trash'],
  479: ['rotom', 'rotom-heat', 'rotom-wash', 'rotom-frost', 'rotom-fan', 'rotom-mow'],
  492: ['shaymin-land', 'shaymin-sky'],
  555: ['darmanitan-standard', 'darmanitan-zen'],
  648: ['meloetta-aria', 'meloetta-pirouette'],
}
const arceusTypes: PokemonType[] = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark']

export async function getSavePokemon(speciesId: number, form: number, signal?: AbortSignal): Promise<Pokemon> {
  if (speciesId === 493) {
    if (!arceusTypes[form]) throw new Error('Forma de Arceus inválida para Gen V.')
    return { ...await getPokemon(speciesId, signal), types: [arceusTypes[form]] }
  }
  if (form === 0 || !typedForms[speciesId]) return getPokemon(speciesId, signal)
  const name = typedForms[speciesId][form]
  if (!name) throw new Error('Forma inválida para Gen V.')
  const cacheKey = `pokemon-bw-form-v1-${speciesId}-${form}`
  const cached = readCache<Pokemon>(cacheKey)
  if (isPokemon(cached) && cached.id === speciesId) return cached
  const pokemon = pokemonFromResponse(await request<PokemonResponse>(`pokemon/${name}`, signal), speciesId)
  writeCache(cacheKey, pokemon)
  return pokemon
}
