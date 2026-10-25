import { historicalBaseStats, versionLearnset, versionMove, evolutionForRules, resourceId } from '../../domain/species-knowledge.ts'
import type { KnowledgeRules, HistoricalStatResponse, KnowledgeLink, KnowledgeNode, KnowledgeMove } from '../../domain/species-knowledge.ts'
import type { LearnsetResponse, MoveResponse } from '../../domain/moves.ts'
import type { BaseStats } from '../../domain/stats.ts'
import type { EvolutionResource } from '../../models/evolution.ts'
import type { SpeciesEntry, ManualPokemon } from './catalog.ts'

export interface KnowledgeService {
  rules: KnowledgeRules
  stats(entry: SpeciesEntry, signal?: AbortSignal): Promise<BaseStats>
  moves(entry: SpeciesEntry, locale: string, signal?: AbortSignal): Promise<KnowledgeMove[]>
  evolution(entry: SpeciesEntry, locale: string, signal?: AbortSignal): Promise<{ root: KnowledgeNode; labels: Record<string, string>; pokemon?: Record<number, ManualPokemon> }>
}

export function createKnowledgeService(rules: KnowledgeRules, fetcher: typeof fetch = fetch): KnowledgeService {
  async function load<Input, T>(path: string, decode: (data: Input) => T, signal?: AbortSignal): Promise<T> {
    if (!/^[a-z-]+\/[a-z0-9-]+$/.test(path)) throw new Error('Invalid resource')
    signal?.throwIfAborted()
    const key = `poke-chose:cache:${rules.gameId}:knowledge-v1:${path}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) return decode(JSON.parse(raw))
    } catch { /* Invalid or inaccessible caches are optional. */ }
    const timeout = AbortSignal.timeout(15000)
    const response = await fetcher(`https://pokeapi.co/api/v2/${path}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
    if (!response.ok) throw new Error('Species detail request failed')
    const raw: unknown = await response.json()
    const result = decode(raw as Input)
    signal?.throwIfAborted()
    try { localStorage.setItem(key, JSON.stringify(raw)) } catch { /* Optional cache. */ }
    return result
  }
  function species(id: number, signal?: AbortSignal) {
    if (!Number.isInteger(id) || id < 1 || id > rules.maxSpecies) throw new Error('Unsupported species')
    return load(`pokemon-species/${id}`, (data: { id: number; varieties: { is_default: boolean; pokemon: EvolutionResource }[]; evolution_chain: EvolutionResource | null }) => {
      if (data.id !== id || !Array.isArray(data.varieties) || !data.varieties.some(row => row.is_default && /^[a-z0-9-]+$/.test(row.pokemon?.name ?? ''))) throw new Error('Missing default variety')
      return data
    }, signal)
  }
  async function pokemon<Input, T>(entry: SpeciesEntry, decode: (data: Input) => T, signal?: AbortSignal) {
    const metadata = await species(entry.id, signal)
    const variety = metadata.varieties.find(row => row.is_default)!.pokemon.name
    return load(`pokemon/${variety}`, (data: Input & { name?: string }) => {
      if (data.name !== variety) throw new Error('Unexpected Pokémon resource')
      return decode(data)
    }, signal)
  }
  return {
    rules,
    stats: (entry, signal) => pokemon(entry, (data: HistoricalStatResponse) => historicalBaseStats(data, rules.generation), signal),
    async moves(entry, locale, signal) {
      const learnset = await pokemon(entry, (data: LearnsetResponse) => versionLearnset(data, rules.versionGroup), signal)
      const result: KnowledgeMove[] = new Array(learnset.length)
      let next = 0
      const workers = await Promise.allSettled(Array.from({ length: Math.min(4, learnset.length) }, async () => {
        while (next < learnset.length) {
          signal?.throwIfAborted()
          const index = next++
          const row = learnset[index]
          const move = await load(`move/${row.slug}`, (data: MoveResponse) => versionMove(data, rules, locale), signal)
          result[index] = { ...move, ...row }
        }
      }))
      const failure = workers.find(worker => worker.status === 'rejected')
      if (failure?.status === 'rejected') throw failure.reason
      return result
    },
    async evolution(entry, locale, signal) {
      const metadata = await species(entry.id, signal)
      if (!metadata.evolution_chain) throw new Error('Missing evolution family')
      const chain = await load(`evolution-chain/${resourceId(metadata.evolution_chain.url)}`, (data: { chain: KnowledgeLink }) => {
        function validate(node: KnowledgeLink) {
          if (!node?.species?.name || !Number.isInteger(resourceId(node.species.url)) || !Array.isArray(node.evolution_details) || !Array.isArray(node.evolves_to) || node.evolution_details.some(method => !method?.trigger?.name)) throw new Error('Invalid family')
          node.evolves_to.forEach(validate)
        }
        validate(data.chain)
        return data.chain
      }, signal)
      const locations = new Set<number>()
      const labels: Record<string, string> = {}
      const localized = (data: { names: { name: string; language: { name: string } }[] }, fallback: string) => {
        if (!Array.isArray(data.names)) throw new Error('Missing resource names')
        return data.names.find(row => row.language.name === locale)?.name ?? data.names.find(row => row.language.name === 'en')?.name ?? fallback
      }
      const resources = new Map<string, EvolutionResource>()
      function collect(node: KnowledgeLink) {
        if (resourceId(node.species.url) > rules.maxSpecies) return
        for (const detail of node.evolution_details) {
          if (detail.version_group && resourceId(detail.version_group.url) > rules.versionGroupId) continue
          for (const resource of [detail.item, detail.held_item, detail.known_move, detail.known_move_type, detail.party_species, detail.party_type, detail.trade_species, detail.location]) {
            if (resource) resources.set(resource.url, resource)
          }
        }
        node.evolves_to.forEach(collect)
      }
      collect(chain)
      // Resource names are localized at the boundary; raw cache entries contain all languages.
      for (const resource of resources.values()) {
        const path = resource.url.match(/\/api\/v2\/((?:item|move|type|location|pokemon-species)\/\d+)\/?$/)?.[1]
        if (!path) throw new Error('Invalid evolution resource')
        const info = await load(path, (data: { names: { name: string; language: { name: string } }[]; region?: { name: string } }) => ({ name: localized(data, resource.name), region: data.region?.name }), signal)
        labels[resource.url] = info.name
        if (path.startsWith('location/') && info.region === rules.region) locations.add(resourceId(resource.url))
      }
      const root = evolutionForRules(chain, rules, locations)
      if (!root) throw new Error('Unsupported family')
      return { root, labels }
    },
  }
}
