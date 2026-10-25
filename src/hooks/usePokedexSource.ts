import { useEffect, useState } from 'react'
import { emptyPokedexSnapshot } from '../sources/pokedex-snapshot'
import type { PokedexBridgeSnapshot } from '../sources/pokedex-snapshot'
import type { createPokedexSource } from '../sources/pokedex-source'

export function usePokedexSource(source: ReturnType<typeof createPokedexSource>, enabled: boolean) {
  const [current, setCurrent] = useState<{ enabled: boolean; snapshot: PokedexBridgeSnapshot }>({ enabled: false, snapshot: emptyPokedexSnapshot(source.sourceId) })
  useEffect(() => {
    if (!enabled) return
    return source.subscribe(snapshot => setCurrent({ enabled: true, snapshot }))
  }, [source, enabled])
  if (current.enabled !== enabled) {
    const snapshot = emptyPokedexSnapshot(source.sourceId)
    setCurrent({ enabled, snapshot })
    return snapshot
  }
  return enabled ? current.snapshot : emptyPokedexSnapshot(source.sourceId)
}
