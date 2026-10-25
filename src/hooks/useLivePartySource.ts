import { useEffect, useRef, useState } from 'react'
import { emptyLivePartySnapshot } from '../sources/live-party-snapshot'
import type { LivePartySnapshot } from '../sources/live-party-snapshot'
import type { createLivePartySource } from '../sources/live-party-source'

export function useLivePartySource(source: ReturnType<typeof createLivePartySource>, enabled: boolean) {
  const [current, setCurrent] = useState<{ enabled: boolean; snapshot: LivePartySnapshot }>({ enabled: false, snapshot: emptyLivePartySnapshot() })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const generation = useRef(0)
  useEffect(() => {
    const token = ++generation.current
    if (!enabled) return
    const unsubscribe = source.subscribe(snapshot => setCurrent({ enabled: true, snapshot }))
    return () => {
      generation.current = token + 1
      unsubscribe()
    }
  }, [enabled, source])
  if (current.enabled !== enabled) {
    setCurrent({ enabled, snapshot: emptyLivePartySnapshot() })
    setBusy(false)
    setError(false)
  }
  async function control(action: 'connect' | 'disconnect' | 'refresh') {
    if (!enabled || busy) return
    const token = generation.current
    setBusy(true)
    setError(false)
    try { await source.control(action) }
    catch { if (token === generation.current) setError(true) }
    finally { if (token === generation.current) setBusy(false) }
  }
  return { snapshot: enabled && current.enabled ? current.snapshot : emptyLivePartySnapshot(), busy, error, control }
}
