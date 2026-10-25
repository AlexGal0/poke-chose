import type { MemoryReader } from './memory-party.ts'
import { readXPokedexFlags } from './pokedex-flags.ts'

// Candidate for the executable fingerprint checked by the Citra session reader.
export const X_MEMORY_POKEDEX_ADDRESS = 0x08c7a8d0
export async function readXMemoryPokedex(reader: MemoryReader) {
  const first = Uint8Array.from(await reader.read(X_MEMORY_POKEDEX_ADDRESS, 0x6a0))
  const second = await reader.read(X_MEMORY_POKEDEX_ADDRESS, 0x6a0)
  if (first.length !== 0x6a0 || second.length !== first.length || !first.every((value, i) => value === second[i])) throw new Error('X Pokédex changed during read')
  // The signature is four bytes. Bytes 4–7 are mutable upgrade/initial-species flags.
  if (![0x17, 0x0f, 0x12, 0x2f].every((value, i) => first[i] === value)) throw new Error('Invalid X Pokédex header')
  return readXPokedexFlags(first)
}
