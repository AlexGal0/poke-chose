import { createKnowledgeService } from '../core/knowledge.ts'
import { xCatalogRules } from './catalog.ts'
import type { KnowledgeRules, KnowledgeNode } from '../../domain/species-knowledge.ts'
import type { ManualPokemon } from '../core/catalog.ts'

export const xKnowledgeRules: KnowledgeRules = {
  gameId: 'x', generation: xCatalogRules.generation,
  versionGroup: 'x-y', versionGroupId: 15, region: 'kalos',
  maxSpecies: xCatalogRules.maxSpecies, types: xCatalogRules.types,
}

const service = createKnowledgeService(xKnowledgeRules)
export async function xEvolutionAppearance(root: KnowledgeNode): Promise<Record<number, ManualPokemon>> {
  const { publicRosterData } = await import('./roster-data.ts')
  const pokemon: Record<number, ManualPokemon> = {}
  function visit(node: KnowledgeNode) {
    const row = publicRosterData.catalog.find(row => row.id === node.id && row.isDefault)
    if (!row) throw new Error('Missing X family appearance')
    pokemon[node.id] = { id: row.id, name: row.name, sprite: row.sprite, types: row.types }
    node.children.forEach(visit)
  }
  visit(root)
  return pokemon
}
// Family artwork and Gen VI types come from the local public catalog, not save data.
export const xKnowledge: typeof service = {
  ...service,
  async evolution(entry, locale, signal) {
    const family = await service.evolution(entry, locale, signal)
    const pokemon = await xEvolutionAppearance(family.root)
    signal?.throwIfAborted()
    return { ...family, pokemon }
  },
}
