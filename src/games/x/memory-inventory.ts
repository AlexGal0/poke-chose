import type { MemoryReader } from './memory-party.ts'
import { X_ITEMS_POCKET_LENGTH, readXItemsPocket } from './inventory.ts'

// Unique saved-prefix match and stable 400-slot read in the fingerprinted local X profile.
export const X_MEMORY_INVENTORY_ADDRESS = 0x08c67554
export async function readXMemoryInventory(reader: MemoryReader) {
  const first = Uint8Array.from(await reader.read(X_MEMORY_INVENTORY_ADDRESS, X_ITEMS_POCKET_LENGTH))
  const second = await reader.read(X_MEMORY_INVENTORY_ADDRESS, X_ITEMS_POCKET_LENGTH)
  if (first.length !== X_ITEMS_POCKET_LENGTH || second.length !== first.length || !first.every((byte, index) => byte === second[index])) throw new Error('X inventory changed during read')
  return readXItemsPocket(first)
}
