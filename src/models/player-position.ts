// Internal Black map identifier, not a PokéAPI location ID.
export interface PlayerPosition {
  mapId: number
  x: number
  y: number
  z: number
}

export function isPlayerPosition(value: unknown): value is PlayerPosition {
  if (!value || typeof value !== 'object') return false
  const position = value as PlayerPosition
  return [position.mapId, position.x, position.y, position.z].every((number, index) =>
    typeof number === 'number' && Number.isInteger(number) && number >= 0 && number <= (index === 0 ? 0xffffffff : 0xffff))
}

export function positionsEqual(a: PlayerPosition | null | undefined, b: PlayerPosition | null | undefined): boolean {
  if (a == null || b == null) return a == null && b == null
  return a.mapId === b.mapId && a.x === b.x && a.y === b.y && a.z === b.z
}
