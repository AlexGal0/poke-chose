import type { EvolutionRequirementsService } from '../core/evolution-requirements.ts'
import type { KnowledgeNode } from '../../domain/species-knowledge.ts'
import type { EvolutionNode } from '../../models/evolution.ts'
import { knowledgeEvolutionFacts } from '../../domain/species-knowledge.ts'
import { xKnowledge } from './knowledge.ts'
import { xCatalogRules } from './catalog.ts'
import { localizedName, request } from '../../api/pokeapi.ts'
import { readCache, writeCache } from '../../storage/local.ts'

export function requirementTree(node: KnowledgeNode): EvolutionNode {
  return { speciesId: node.id, name: node.name, methods: node.methods.filter((method, index, methods) => {
    // Planning is per species: cosmetic colors/sizes with identical conditions share a route.
    const signature = (value: typeof method) => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !['required_pokemon_form', 'evolved_pokemon_form', 'base_form', 'evolved_form'].includes(key)).sort(([a], [b]) => a.localeCompare(b))))
    return methods.findIndex(other => signature(other) === signature(method)) === index
  }), children: node.children.map(requirementTree) }
}

export const xEvolutionRequirements: EvolutionRequirementsService = {
  inventoryHintKey: 'evolutionRequirements.inventoryX',
  defaultScope: 'regional',
  scopes: [
    { id: 'regional', labelKey: 'evolutionRequirements.kalos' },
    { id: 'national', labelKey: 'evolutionRequirements.nationalOnly' },
    { id: 'all', labelKey: 'evolutionRequirements.all' },
  ],
  inScope(id, scope) {
    const regional = xCatalogRules.regionalSpeciesIds!.includes(id)
    return id >= 1 && id <= xCatalogRules.maxSpecies && (scope === 'all' || (scope === 'regional' && regional) || (scope === 'national' && !regional))
  },
  async family(id, locale, signal) {
    const { publicRosterData } = await import('./roster-data.ts')
    const entry = publicRosterData.catalog.find(row => row.id === id && row.isDefault)
    if (!entry) throw new Error('Unsupported X species')
    const family = await xKnowledge.evolution(entry, locale, signal)
    return { root: requirementTree(family.root), labels: family.labels, sprites: Object.fromEntries(Object.entries(family.pokemon ?? {}).map(([id, pokemon]) => [id, pokemon.sprite])) }
  },
  async item(name, locale, signal) {
    const key = `evolution-item-x-${locale}-v2-${name}`
    const cached = readCache<{ name: string; inventoryKey?: string }>(key)
    if (cached && typeof cached.name === 'string' && (cached.inventoryKey === undefined || typeof cached.inventoryKey === 'string' && /^[1-9]\d*$/.test(cached.inventoryKey) && Number(cached.inventoryKey) <= 717)) return cached
    const data = await request<{ name: string; names: { name: string; language: { name: string } }[]; game_indices: { game_index: number; generation: { name: string } }[] }>(`item/${name}`, signal)
    const index = data.game_indices.find(row => row.generation.name === 'generation-vi')?.game_index
    const item = { name: localizedName(data.names, locale) ?? data.name, ...(index != null && Number.isInteger(index) && index > 0 && index <= 717 ? { inventoryKey: String(index) } : {}) }
    writeCache(key, item)
    return item
  },
  methodFacts: (method, id, labels) => knowledgeEvolutionFacts({ ...method }, id, labels).map(fact => ({ key: `speciesKnowledge.conditions.${fact.id}`, params: fact.params })),
}
