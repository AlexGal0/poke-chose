import { createKnowledgeService } from '../core/knowledge.ts'
import type { CatalogRules } from '../core/catalog.ts'
import type { KnowledgeRules, KnowledgeNode } from '../../domain/species-knowledge.ts'
import type { ManualPokemon } from '../core/catalog.ts'

export async function xyEvolutionAppearance(root: KnowledgeNode): Promise<Record<number, ManualPokemon>> {
  const { publicRosterData } = await import('../x/roster-data.ts')
  const pokemon: Record<number, ManualPokemon> = {}
  function visit(node: KnowledgeNode) {
    const row = publicRosterData.catalog.find(row => row.id === node.id && row.isDefault)
    if (!row) throw new Error('Missing XY family appearance')
    pokemon[node.id] = { id: row.id, name: row.name, sprite: row.sprite, types: row.types }
    node.children.forEach(visit)
  }
  visit(root)
  return pokemon
}
// Family artwork and Gen VI types come from the local public catalog, not save data.
export function createXYKnowledge(catalog: CatalogRules) {
  const rules: KnowledgeRules = { gameId: catalog.id, generation: catalog.generation, versionGroup: 'x-y', versionGroupId: 15, region: 'kalos', maxSpecies: catalog.maxSpecies, types: catalog.types }
  const service = createKnowledgeService(rules)
  return {
    ...service,
    async evolution(entry: import('../core/catalog.ts').SpeciesEntry, locale: string, signal?: AbortSignal) {
      const family = await service.evolution(entry, locale, signal)
      const pokemon = await xyEvolutionAppearance(family.root)
      signal?.throwIfAborted()
      return { ...family, pokemon }
    },
  }
}
