export function blackWhitePokedexScope(speciesId: number): 'unova' | 'national' | null {
  if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 649) return null
  return speciesId >= 494 ? 'unova' : 'national'
}
