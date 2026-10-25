import { useEffect, useState } from 'react'
import { resolveSavedRoster, visibleRosterResolution } from '../games/core/saved-roster'
import type { SavedRosterService, RosterResolution } from '../games/core/saved-roster'
import type { SavedPartyMember, SavedBoxPokemon } from '../models/party'

export function useSavedRoster(service: SavedRosterService, party: SavedPartyMember[] | undefined, boxes: SavedBoxPokemon[] | undefined, sourceKey: string) {
  const key = party && boxes ? JSON.stringify([party, boxes]) : null
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<RosterResolution | null>(null)
  useEffect(() => {
    if (key === null) return
    const controller = new AbortController()
    const [party, boxes] = JSON.parse(key) as [SavedPartyMember[], SavedBoxPokemon[]]
    resolveSavedRoster(service, party, boxes, controller.signal).then(roster => {
      if (!controller.signal.aborted) setResult({ key, sourceKey, service, ...roster, error: false })
    }).catch(() => { if (!controller.signal.aborted) setResult({ key, sourceKey, service, party: null, collection: null, error: true }) })
    return () => controller.abort()
  }, [service, key, sourceKey, attempt])
  const visible = visibleRosterResolution(result, key, sourceKey, service)
  return { party: visible?.party ?? null,
    collection: visible?.collection ?? null,
    error: visible?.key === key && visible?.error === true,
    loading: key !== null && visible?.key !== key,
    updating: visible?.party != null && visible.key !== key,
    retry: () => { setResult(null); setAttempt(value => value + 1) } }
}
