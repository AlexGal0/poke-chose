import type { MegaEvolution, MegaInventory } from '../games/core/mega-evolutions.ts'

export function megaAvailability(entry: MegaEvolution, inventory: MegaInventory, collection: readonly { id: number; isEgg?: boolean }[] | null, collectionStale: boolean) {
  const quantity = inventory.quantities ? inventory.quantities[entry.inventoryKey] ?? { bag: 0, held: 0 } : null
  const owned = collection === null ? null : collection.some(pokemon => !pokemon.isEgg && pokemon.id === entry.speciesId)
  const hasStone = quantity === null ? null : quantity.bag + quantity.held > 0
  return { quantity, owned, hasStone, canPreview: hasStone === true && owned === true && !inventory.stale && !collectionStale }
}
