import type { InventoryItem } from '../src/models/inventory.ts'
import { isInventory } from '../src/models/inventory.ts'

export const INVENTORY_OFFSET = 0x18400
export const INVENTORY_LENGTH = 0x9c0
export function parseInventoryBlock(block: Uint8Array): InventoryItem[] {
  if (block.length !== INVENTORY_LENGTH) throw new Error('Invalid inventory block size.')
  const fields = new DataView(block.buffer, block.byteOffset, block.byteLength)
  const items: InventoryItem[] = []
  for (let offset = 0; offset < 0x4d8; offset += 4) {
    const gameIndex = fields.getUint16(offset, true)
    const count = fields.getUint16(offset + 2, true)
    if (!gameIndex && !count) continue
    items.push({ gameIndex, count })
  }
  if (!isInventory(items)) throw new Error('Invalid item quantities or identifiers.')
  return items
}
