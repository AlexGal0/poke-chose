import type { MemoryReader } from './memory-party.ts'
import { readXDaycareBlock, X_DAYCARE_BLOCK } from './daycare-data.ts'

// Eevee female level 19 confirmed locally; session fingerprint is mandatory.
// This is guest memory for the installed X profile, never an offset in main.
export const X_MEMORY_DAYCARE_ADDRESS = 0x08c7ff34
export async function readXMemoryDaycare(reader: MemoryReader) {
  const first = Uint8Array.from(await reader.read(X_MEMORY_DAYCARE_ADDRESS, X_DAYCARE_BLOCK.length))
  const second = await reader.read(X_MEMORY_DAYCARE_ADDRESS, X_DAYCARE_BLOCK.length)
  if (first.length !== X_DAYCARE_BLOCK.length || second.length !== first.length || !first.every((byte, index) => byte === second[index])) throw new Error('X daycare changed during read')
  return readXDaycareBlock(second)
}
