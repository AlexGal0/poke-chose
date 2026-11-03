export function matchesCatalogCapture(speciesId: number, onlyMissing: boolean, caughtSpeciesIds: ReadonlySet<number> | null): boolean {
  return !onlyMissing || (caughtSpeciesIds !== null && !caughtSpeciesIds.has(speciesId))
}
