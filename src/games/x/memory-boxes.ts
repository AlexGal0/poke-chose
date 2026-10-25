import type { MemoryReader } from './memory-party.ts'
import { readPk6, PK6_STORED_SIZE } from './pk6.ts'
import type { SavedBoxPokemon } from '../../models/party.ts'

// Locally validated X profile; the Citra session checks the executable fingerprint.
export const X_MEMORY_BOXES_ADDRESS = 0x08c861b8
export const X_MEMORY_BOXES_SIZE = 31 * 30 * PK6_STORED_SIZE
export async function readXMemoryBoxes(reader: MemoryReader): Promise<SavedBoxPokemon[]> {
  async function sample() {
    const bytes = new Uint8Array(X_MEMORY_BOXES_SIZE)
    for (let offset = 0; offset < bytes.length; offset += 4096) {
      const length = Math.min(4096, bytes.length - offset)
      const chunk = await reader.read(X_MEMORY_BOXES_ADDRESS + offset, length)
      if (chunk.length !== length) throw new Error('Incomplete X boxes')
      bytes.set(chunk, offset)
    }
    return bytes
  }
  const first = await sample()
  const second = await sample()
  if (!first.every((value, i) => value === second[i])) throw new Error('X boxes changed during read')
  const boxes: SavedBoxPokemon[] = []
  for (let index = 0; index < 31 * 30; index++) {
    const pokemon = readPk6(second.subarray(index * PK6_STORED_SIZE, (index + 1) * PK6_STORED_SIZE))
    if (pokemon) boxes.push({ ...pokemon, box: Math.floor(index / 30), slot: index % 30 })
  }
  return boxes
}
