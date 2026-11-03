import { useEffect, useState } from 'react'
import type { PokemonDataSource } from '../../sources/data-source'
import { advanceBlackSource, emptyBlackSource } from './source-state'

export function useBlackSource(source: PokemonDataSource | null) {
  const [result, setResult] = useState({ source, state: emptyBlackSource })
  if (result.source !== source) setResult({ source, state: emptyBlackSource })
  useEffect(() => {
    if (!source) return
    let state = emptyBlackSource
    let closed = false
    const unsubscribe = source.subscribe(event => {
      if (closed) return
      state = advanceBlackSource(state, event, source.id, source.capabilities.repel === true)
      setResult({ source, state })
    })
    return () => { closed = true; unsubscribe() }
  }, [source])
  return result.source === source ? result.state : emptyBlackSource
}
