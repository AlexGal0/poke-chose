import type { PokedexState } from '../../models/pokedex.ts'

// XY species bitfields shared by the save block and the validated RAM structure.
export function readXPokedexFlags(bytes: Uint8Array): PokedexState {
  if (bytes.length !== 0x6a0) throw new Error('Incomplete X Pokedex block')
  const flag = (offset: number, speciesId: number) => (bytes[offset + ((speciesId - 1) >> 3)] & (1 << ((speciesId - 1) & 7))) !== 0
  const seenSpeciesIds = new Set<number>()
  const caughtSpeciesIds = new Set<number>()
  for (let speciesId = 1; speciesId <= 721; speciesId++) {
    if ([0x68, 0xc8, 0x128, 0x188].some(offset => flag(offset, speciesId))) seenSpeciesIds.add(speciesId)
    // XY tracks pre-Gen VI transfers separately, for species 1..649 only.
    if (flag(8, speciesId) || (speciesId <= 649 && flag(0x64c, speciesId))) caughtSpeciesIds.add(speciesId)
  }
  return { seenSpeciesIds, caughtSpeciesIds }
}
