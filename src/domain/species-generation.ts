const GENERATION_ENDS = [151, 251, 386, 493, 649, 721, 809, 905, 1025]

export function speciesGeneration(speciesId: number): number | null {
  if (!Number.isInteger(speciesId) || speciesId < 1) return null
  const index = GENERATION_ENDS.findIndex(last => speciesId <= last)
  return index < 0 ? null : index + 1
}
