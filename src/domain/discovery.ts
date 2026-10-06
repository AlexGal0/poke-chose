import type { PokedexState } from '../models/pokedex.ts'

export function discoveredSpecies(pokedex: PokedexState | null): Set<number> {
  return new Set([...(pokedex?.seenSpeciesIds ?? []), ...(pokedex?.caughtSpeciesIds ?? [])])
}
