import { emptyLivePartySnapshot, isLivePartySnapshot } from './live-party-snapshot.ts'
import type { LivePartySnapshot } from './live-party-snapshot.ts'

interface Events { onmessage: ((event: { data: string }) => void) | null; onerror: (() => void) | null; close(): void }
function openEvents(url: string): Events {
  const source = new EventSource(url)
  const events: Events = { onmessage: null, onerror: null, close: () => source.close() }
  source.onmessage = event => events.onmessage?.({ data: event.data })
  source.onerror = () => events.onerror?.()
  return events
}
export function createLivePartySource(connect: (url: string) => Events = openEvents, fetcher: typeof fetch = fetch) {
  return {
    subscribe(notify: (snapshot: LivePartySnapshot) => void) {
      let current = emptyLivePartySnapshot()
      let closed = false
      const emit = (value: LivePartySnapshot) => { if (!closed) { current = value; notify(value) } }
      emit(current)
      let events: Events
      try { events = connect('/x-live-api/events') }
      catch { emit({ ...current, status: 'error', message: 'connectionLost', boxesStatus: current.boxes ? 'error' : 'waiting' }); return () => { closed = true } }
      events.onmessage = event => {
        if (closed) return
        try {
          const snapshot: unknown = JSON.parse(event.data)
          if (!isLivePartySnapshot(snapshot)) return
          if (snapshot.capabilities?.daycare === true && snapshot.daycare == null && current.daycare != null) Object.assign(snapshot, { daycare: current.daycare, daycareStale: true })
          if (snapshot.boxes === null && current.boxes !== null) Object.assign(snapshot, { boxes: current.boxes, boxesUpdatedAt: current.boxesUpdatedAt, boxesStatus: 'error' })
          emit(snapshot.party === null && current.party !== null ? { ...snapshot, party: current.party, pokedex: current.pokedex, updatedAt: current.updatedAt } : snapshot)
        } catch { /* Malformed payloads never replace valid data. */ }
      }
      events.onerror = () => emit({ ...current, status: 'error', message: 'connectionLost', boxesStatus: current.boxes ? 'error' : 'waiting' })
      return () => { closed = true; events.close() }
    },
    async control(action: 'connect' | 'disconnect' | 'refresh') {
      const response = await fetcher(`/x-live-api/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error('Live control failed')
    },
  }
}
