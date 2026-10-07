// Internal Black map identifier, not a PokéAPI location ID.
export interface PlayerPosition {
  mapId: number
  // A live map field may be known before its coordinate structure is identified.
  x?: number
  y?: number
  z?: number
}

export function isPlayerPosition(value: unknown): value is PlayerPosition {
  if (!value || typeof value !== 'object') return false
  const position = value as PlayerPosition
  const integer = (number: unknown, max: number) => typeof number === 'number' && Number.isInteger(number) && number >= 0 && number <= max
  return integer(position.mapId, 0xffffffff) &&
    ([position.x, position.y, position.z].every(number => number === undefined) ||
      [position.x, position.y, position.z].every(number => integer(number, 0xffff)))
}

export function positionsEqual(a: PlayerPosition | null | undefined, b: PlayerPosition | null | undefined): boolean {
  if (a == null || b == null) return a == null && b == null
  return a.mapId === b.mapId && a.x === b.x && a.y === b.y && a.z === b.z
}
