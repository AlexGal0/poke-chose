import type { EvolutionDetail, EvolutionNode } from '../../models/evolution.ts'
import type { EvolutionFact } from '../../domain/evolution.ts'

/** Families and methods must already be filtered for the selected game. */
export interface EvolutionRequirementsService {
  scopeInfo?: (speciesId: number) => import('./catalog.ts').ManualPokemon['scope']
  inventoryHintKey?: string
  defaultScope: string
  scopes: readonly { id: string; labelKey: string }[]
  inScope(speciesId: number, scope: string): boolean
  family(speciesId: number, locale: string, signal?: AbortSignal): Promise<{ root: EvolutionNode; labels?: Record<string, string>; sprites?: Record<number, string | null> }>
  item(name: string, locale: string, signal?: AbortSignal): Promise<EvolutionRequirementItem>
  methodFacts(method: EvolutionDetail, targetId: number, labels: Record<string, string>): EvolutionFact[]
}

export interface EvolutionRequirementItem {
  name: string
  /** Opaque key in this source's inventory; absence means quantity unknown. */
  inventoryKey?: string
}

/** Null means unavailable, an empty map means a successfully read empty inventory.
 * Bag and held counts must come from the same snapshot, never mixed sources.
 */
export interface EvolutionInventory {
  quantities: Readonly<Record<string, { bag: number; held: number }>> | null
  stale: boolean
}
