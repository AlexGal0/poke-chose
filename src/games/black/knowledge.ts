import type { KnowledgeService } from '../core/knowledge.ts'
import { evolutionMethodFacts } from '../../domain/evolution.ts'
import type { KnowledgeNode, KnowledgeRules } from '../../domain/species-knowledge.ts'
import type { EvolutionNode } from '../../models/evolution.ts'
import { getEvolutionFamily, getEvolutionSpecies, getEvolutionTree } from '../../api/evolution.ts'
import { getBaseStats } from '../../api/stats.ts'
import { getLevelMoves } from '../../api/moves.ts'
import { blackCatalogRules } from './catalog.ts'

export const blackKnowledgeRules: KnowledgeRules = {
  gameId: 'black', generation: 5, versionGroup: 'black-white', versionGroupId: 11,
  maxSpecies: 649, region: 'unova', types: blackCatalogRules.types,
}
export function blackKnowledgeTree(node: EvolutionNode): KnowledgeNode {
  return { id: node.speciesId, name: node.name, methods: node.methods.map(method => ({ ...method })), children: node.children.map(blackKnowledgeTree) }
}
export const blackKnowledge: KnowledgeService = {
  rules: blackKnowledgeRules,
  stats: (entry, signal) => getBaseStats(entry.id, entry.form ?? 0, signal),
  moves: (entry, locale, signal) => getLevelMoves(entry.resourceName ?? entry.name, locale, signal),
  async evolution(entry, locale, signal) {
    const family = await getEvolutionTree(entry.id, locale, signal)
    return { ...family, root: blackKnowledgeTree(family.root) }
  },
  progression: async (entry, _locale, signal) => blackKnowledgeTree(await getEvolutionFamily(await getEvolutionSpecies(entry.id, signal), signal)),
  methodFacts: evolutionMethodFacts,
}
