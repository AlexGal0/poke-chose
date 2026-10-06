import { getPokemon, localizedName, request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'
import { blackWhiteEvolutionTree, evolutionResourceId } from '../domain/evolution.ts'
import type { EvolutionLink, EvolutionNode, EvolutionResource, EvolutionTree } from '../models/evolution.ts'

async function cachedRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  const key = `evolution-v1-${path}`
  const cached = readCache<T>(key)
  if (cached) return cached
  const data = await request<T>(path, signal)
  writeCache(key, data)
  return data
}

export interface EvolutionSpecies {
  evolution_chain: { url: string } | null
  varieties?: { is_default: boolean; pokemon: EvolutionResource }[]
  egg_groups?: EvolutionResource[]
  gender_rate?: number
}

export function getEvolutionSpecies(speciesId: number, signal?: AbortSignal) {
  return cachedRequest<EvolutionSpecies>(`pokemon-species/${speciesId}`, signal)
}

export async function getEvolutionFamily(species: EvolutionSpecies, signal?: AbortSignal) {
  if (!species.evolution_chain) throw new Error('PokéAPI no ofrece una familia evolutiva para esta especie.')
  const chain = await cachedRequest<{ chain: EvolutionLink }>(`evolution-chain/${evolutionResourceId(species.evolution_chain.url)}`, signal)
  const root = blackWhiteEvolutionTree(chain.chain)
  if (!root) throw new Error('Familia evolutiva fuera de Generación V.')
  return root
}

export async function getEvolutionTree(speciesId: number, locale: string, signal?: AbortSignal): Promise<EvolutionTree> {
  const species = await getEvolutionSpecies(speciesId, signal)
  const root = await getEvolutionFamily(species, signal)
  const nodes: EvolutionNode[] = []
  function visit(node: EvolutionNode) { nodes.push(node); node.children.forEach(visit) }
  visit(root)
  const resources = new Map<string, EvolutionResource>()
  for (const node of nodes) for (const method of node.methods) {
    for (const resource of [method.item, method.held_item, method.known_move]) if (resource) resources.set(resource.url, resource)
  }
  const [pokemon, localized] = await Promise.all([
    Promise.all(nodes.map(node => getPokemon(node.speciesId, signal))),
    Promise.all([...resources.values()].map(async resource => {
      const path = resource.url.split('/api/v2/')[1]?.replace(/\/$/, '')
      if (!path || !/^(item|move)\/\d+$/.test(path)) throw new Error('Referencia de evolución inválida.')
      const data = await cachedRequest<{ names: { name: string; language: { name: string } }[] }>(path, signal)
      return [resource.url, localizedName(data.names, locale) ?? resource.name] as const
    })),
  ])
  return { root, pokemon: Object.fromEntries(pokemon.map(member => [member.id, member])), labels: Object.fromEntries(localized) }
}
