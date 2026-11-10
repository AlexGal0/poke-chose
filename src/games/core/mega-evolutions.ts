import type { BaseStats } from '../../domain/stats.ts'

/** Adapter-supplied forms valid for this game; no species or generation assumptions in the screen. */
export interface MegaEvolution {
  id: string
  inventoryKey: string
  speciesId: number
  name: string
  variant: string | null
  stoneName: string
  sprite: string
  megaSprite: string
  stoneIcon: string
  baseStats: BaseStats
  megaStats: BaseStats
  types: readonly string[]
  megaTypes: readonly string[]
}

/** Supplying this service opts a workspace into the mega screen. */
export interface MegaEvolutionService {
  load(locale: string, signal?: AbortSignal): Promise<readonly MegaEvolution[]>
}

/** Bag and held quantities must originate in one source snapshot.
 * Null is unavailable; an empty map is a confirmed empty inventory.
 */
export interface MegaInventory {
  quantities: Readonly<Record<string, { bag: number; held: number }>> | null
  stale: boolean
}
