import type { PokemonDataSource } from './data-source.ts'

export const saveDataSource: PokemonDataSource = {
  id: 'save',
  labelKey: 'sources.save.label',
  capabilities: { party: true, boxes: true, pokedex: true },
  subscribe(notify) {
    const events = new EventSource('/save-api/events')
    events.onopen = () => notify({ type: 'connection', connected: true, message: { key: 'sources.save.connectedWaiting' } })
    events.onerror = () => notify({ type: 'connection', connected: false, message: { key: 'sources.save.bridgeDisconnected' } })
    events.onmessage = event => {
      let snapshot: unknown
      try { snapshot = JSON.parse(event.data) }
      catch { snapshot = null }
      notify({ type: 'snapshot', snapshot })
    }
    return () => events.close()
  },
}
