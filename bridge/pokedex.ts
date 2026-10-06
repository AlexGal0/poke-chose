import type { PokedexState } from '../src/models/pokedex.ts'

export const POKEDEX_OFFSET = 0x21600
export const POKEDEX_LENGTH = 0x4d4

// Independently implemented from the BW block/flag layout documented in PKHeX Zukan5.
// Bit index is National species ID minus one; seen regions do NOT imply caught.
export function parsePokedexBlock(block: Uint8Array): PokedexState {
  if (block.length !== POKEDEX_LENGTH) throw new Error('Bloque Pokédex BW incompleto.')
  const seenSpeciesIds = new Set<number>()
  const caughtSpeciesIds = new Set<number>()
  for (let speciesId = 1; speciesId <= 649; speciesId++) {
    const bit = speciesId - 1
    const byte = bit >>> 3
    const mask = 1 << (bit & 7)
    if (block[0x08 + byte] & mask) caughtSpeciesIds.add(speciesId)
    if ([0, 1, 2, 3].some(region => block[0x5c + region * 0x54 + byte] & mask)) seenSpeciesIds.add(speciesId)
  }
  return { seenSpeciesIds, caughtSpeciesIds }
}
