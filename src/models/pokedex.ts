export interface PokedexState {
  seenSpeciesIds: Set<number>
  caughtSpeciesIds: Set<number>
}

// JSON/SSE cannot encode Set. Convert only at the transport boundary.
export interface PokedexSnapshot {
  seenSpeciesIds: number[]
  caughtSpeciesIds: number[]
}

export function serializePokedex(state: PokedexState): PokedexSnapshot {
  return { seenSpeciesIds: [...state.seenSpeciesIds].sort((a, b) => a - b), caughtSpeciesIds: [...state.caughtSpeciesIds].sort((a, b) => a - b) }
}

export function deserializePokedex(snapshot: PokedexSnapshot): PokedexState {
  return { seenSpeciesIds: new Set(snapshot.seenSpeciesIds), caughtSpeciesIds: new Set(snapshot.caughtSpeciesIds) }
}

export function isPokedexSnapshot(value: unknown): value is PokedexSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as PokedexSnapshot
  return [snapshot.seenSpeciesIds, snapshot.caughtSpeciesIds].every(ids => Array.isArray(ids) && ids.length <= 649 &&
    new Set(ids).size === ids.length && ids.every(id => Number.isInteger(id) && id >= 1 && id <= 649))
}

export function pokedexEqual(a: PokedexSnapshot | null, b: PokedexSnapshot): boolean {
  return a !== null && (['seenSpeciesIds', 'caughtSpeciesIds'] as const).every(key => {
    const ids = new Set(a[key])
    return ids.size === b[key].length && b[key].every(id => ids.has(id))
  })
}
