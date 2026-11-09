const key = (gameId: string) => `poke-chose:${gameId}:zone-item-progress:v1`
export function loadZoneItemProgress(gameId: string): ReadonlySet<string> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key(gameId)) ?? 'null')
    return new Set(Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 160) : [])
  } catch { return new Set() }
}
export function saveZoneItemProgress(gameId: string, ids: ReadonlySet<string>): boolean {
  try { localStorage.setItem(key(gameId), JSON.stringify([...ids])); return true } catch { return false }
}
