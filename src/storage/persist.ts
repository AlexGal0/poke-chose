const CACHE_PREFIX = 'poke-chose:cache:'

function quotaExceeded(error: unknown): boolean {
  return error instanceof Error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

export function persistValue(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    if (!quotaExceeded(error)) return false
  }
  try {
    const cached: { key: string; size: number }[] = []
    for (let index = 0; index < localStorage.length; index++) {
      const cacheKey = localStorage.key(index)
      if (cacheKey?.startsWith(CACHE_PREFIX)) cached.push({ key: cacheKey, size: localStorage.getItem(cacheKey)?.length ?? 0 })
    }
    cached.sort((a, b) => b.size - a.size)
    for (const entry of cached) {
      localStorage.removeItem(entry.key)
      try {
        localStorage.setItem(key, value)
        return true
      } catch (error) {
        if (!quotaExceeded(error)) return false
      }
    }
  } catch { return false }
  return false
}
