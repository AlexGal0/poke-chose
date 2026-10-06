import { request } from './pokeapi.ts'
import { getEvolutionFamily, getEvolutionSpecies } from './evolution.ts'
import { acquisitionTags, findEvolutionNode } from '../domain/acquisition.ts'
import type { PokemonEncounter } from '../domain/acquisition.ts'
import { evolutionResourceId } from '../domain/evolution.ts'
import { readCache, writeCache } from '../storage/local.ts'

export async function getAcquisitionTags(speciesId: number, signal?: AbortSignal) {
  const species = await getEvolutionSpecies(speciesId, signal)
  const pokemonId = species.varieties?.find(variety => variety.is_default)?.pokemon.url
  const id = pokemonId ? evolutionResourceId(pokemonId) : speciesId
  const key = `acquisition-black-encounters-v1-${id}`
  const cached = readCache<PokemonEncounter[]>(key)
  const [encounters, family] = await Promise.all([
    cached ?? request<PokemonEncounter[]>(`pokemon/${id}/encounters`, signal),
    getEvolutionFamily(species, signal),
  ])
  if (!cached) writeCache(key, encounters)
  const node = findEvolutionNode(family, speciesId)
  const groups = species.egg_groups ?? []
  const breedableBase = family.speciesId === speciesId && groups.length > 0 && !groups.some(group => ['no-eggs', 'ditto'].includes(group.name))
  return acquisitionTags(speciesId, encounters, node, breedableBase)
}
