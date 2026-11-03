import type { InventoryItem } from '../../models/inventory.ts'
import { SavePokedexError } from '../core/save-pokedex.ts'
import type { InventoryLimits } from '../core/inventory.ts'

export const X_INVENTORY_BLOCK = { id: 1, offset: 0x400, length: 0xb88 } as const
export const X_ITEMS_POCKET_LENGTH = 0x640
export const X_INVENTORY_LIMITS: InventoryLimits = { maxItemIndex: 717, bagSlots: 400, heldSlots: 936 }
// XY general items pocket: 400 pairs of little-endian u16 item index/count.
// Other pockets are deliberately not published. See docs/es/x-inventory.md.
export function readXItemsPocket(bytes: Uint8Array): InventoryItem[] {
  if (bytes.length !== X_ITEMS_POCKET_LENGTH) throw new SavePokedexError('size')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const items: InventoryItem[] = []
  const seen = new Set<number>()
  for (let offset = 0; offset < bytes.length; offset += 4) {
    const gameIndex = view.getUint16(offset, true), count = view.getUint16(offset + 2, true)
    if (gameIndex === 0 && count === 0) continue
    if (gameIndex < 1 || gameIndex > X_INVENTORY_LIMITS.maxItemIndex || count < 1 || count > 999 || seen.has(gameIndex)) throw new SavePokedexError('format')
    seen.add(gameIndex)
    items.push({ gameIndex, count })
  }
  return items
}
