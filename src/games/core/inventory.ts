import type { InventoryItem } from '../../models/inventory.ts'
import type { SavedPokemonData } from '../../models/party.ts'

/** Bag and held counts from one stable source reading. */
export interface InventoryReading { bag: InventoryItem[]; held: InventoryItem[] }
export interface InventoryLimits { maxItemIndex: number; bagSlots: number; heldSlots: number }
export function isInventoryReading(value: unknown, limits: InventoryLimits): value is InventoryReading {
  if (!value || typeof value !== 'object') return false
  const data = value as InventoryReading
  const valid = (items: unknown, slots: number, maxCount: number): items is InventoryItem[] => Array.isArray(items) && items.length <= slots &&
    new Set(items.map(item => item?.gameIndex)).size === items.length && items.every(item => item && Number.isInteger(item.gameIndex) && item.gameIndex > 0 && item.gameIndex <= limits.maxItemIndex && Number.isInteger(item.count) && item.count > 0 && item.count <= maxCount)
  return valid(data.bag, limits.bagSlots, 999) && valid(data.held, limits.heldSlots, limits.heldSlots) && data.held.reduce((total, item) => total + item.count, 0) <= limits.heldSlots
}
export function inventoryReading(bag: InventoryItem[], pokemon: readonly Pick<SavedPokemonData, 'isEgg' | 'heldItemId'>[]): InventoryReading {
  const held = new Map<number, number>()
  for (const member of pokemon) if (!member.isEgg && member.heldItemId) held.set(member.heldItemId, (held.get(member.heldItemId) ?? 0) + 1)
  return { bag, held: [...held].map(([gameIndex, count]) => ({ gameIndex, count })) }
}
