import { blackSpeciesScope } from './catalog.ts'
import type { EvolutionRequirementsService } from '../core/evolution-requirements.ts'
import { getEvolutionTree } from '../../api/evolution.ts'
import { getEvolutionItem } from '../../api/evolution-items.ts'
import { blackWhitePokedexScope } from '../../domain/pokedex-scope.ts'
import { evolutionMethodFacts } from '../../domain/evolution.ts'

export const blackEvolutionRequirements: EvolutionRequirementsService = {
  defaultScope: 'unova',
  scopes: [
    { id: 'unova', labelKey: 'pokedexScope.unova.label' },
    { id: 'national', labelKey: 'evolutionRequirements.nationalOnly' },
    { id: 'all', labelKey: 'evolutionRequirements.all' },
  ],
  inScope: (id, scope) => scope === 'all' || blackWhitePokedexScope(id) === scope,
  scopeInfo: blackSpeciesScope,
  family: async (id, locale, signal) => {
    const family = await getEvolutionTree(id, locale, signal)
    return { root: family.root, labels: family.labels, sprites: Object.fromEntries(Object.entries(family.pokemon).map(([id, pokemon]) => [id, pokemon.sprite])) }
  },
  async item(name, locale, signal) {
    const item = await getEvolutionItem(name, locale, signal)
    return { name: item.name, inventoryKey: item.gameIndex == null ? undefined : String(item.gameIndex) }
  },
  methodFacts: evolutionMethodFacts,
}

/** Only combine bag and held counts supplied by useSaveInventory's single snapshot. */
export function blackEvolutionInventory(inventory: readonly { gameIndex: number; count: number }[] | null, held: Readonly<Record<number, number>>) {
  if (inventory == null) return null
  const quantities: Record<string, { bag: number; held: number }> = {}
  for (const item of inventory) quantities[item.gameIndex] = { bag: item.count, held: 0 }
  for (const [key, count] of Object.entries(held)) quantities[key] = { bag: quantities[key]?.bag ?? 0, held: count }
  return quantities
}
