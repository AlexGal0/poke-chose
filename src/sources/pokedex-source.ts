import { emptyPokedexSnapshot, isPokedexBridgeSnapshot } from './pokedex-snapshot.ts'
import type { PokedexBridgeSnapshot } from './pokedex-snapshot.ts'
import type { SavedPokemonLimits } from './saved-pokemon-validation.ts'

interface EventConnection {
  onmessage: ((event: { data: string }) => void) | null
  onerror: (() => void) | null
  close(): void
}
function openEventConnection(url: string): EventConnection {
  const events = new EventSource(url)
  const connection: EventConnection = { onmessage: null, onerror: null, close: () => events.close() }
  events.onmessage = event => connection.onmessage?.({ data: event.data })
  events.onerror = () => connection.onerror?.()
  return connection
}
export function createPokedexSource(sourceId: string, maxSpecies: number, connect: (url: string) => EventConnection = openEventConnection, pokemonLimits?: SavedPokemonLimits) {
  return {
    sourceId,
    subscribe(notify: (snapshot: PokedexBridgeSnapshot) => void) {
      let current = emptyPokedexSnapshot(sourceId)
      let closed = false
      const emit = (snapshot: PokedexBridgeSnapshot) => { if (!closed) { current = snapshot; notify(snapshot) } }
      emit(current)
      let connection: EventConnection
      try { connection = connect(`/${sourceId}-api/events`) }
      catch { emit({ ...current, status: 'error', message: 'connectionLost' }); return () => { closed = true } }
      connection.onmessage = event => {
        if (closed) return
        try {
          const snapshot: unknown = JSON.parse(event.data)
          if (!isPokedexBridgeSnapshot(snapshot, sourceId, maxSpecies, pokemonLimits)) return
          if (snapshot.capabilities?.daycare === true && snapshot.daycare == null && current.daycare != null) Object.assign(snapshot, { daycare: current.daycare, daycareStale: true })
          emit(snapshot.pokedex === null && current.pokedex !== null
            ? { ...snapshot, pokedex: current.pokedex, updatedAt: current.updatedAt, party: current.party, boxes: current.boxes, ...(snapshot.capabilities?.daycare === true ? { daycare: current.daycare, daycareStale: true } : {}) } : snapshot)
        } catch { /* Ignore malformed/unrelated events; never reveal sprites from them. */ }
      }
      connection.onerror = () => emit({ ...current, daycareStale: true, status: 'error', message: 'connectionLost' })
      return () => { closed = true; connection.close() }
    },
  }
}
