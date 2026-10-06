import type { PokemonDataSource } from './data-source.ts'

export const saveDataSource: PokemonDataSource = {
  id: 'save',
  label: 'Save de melonDS',
  capabilities: { party: true, boxes: true, pokedex: true },
  subscribe(notify) {
    const events = new EventSource('/save-api/events')
    events.onopen = () => notify({ type: 'connection', connected: true, message: 'melonDS: conectado · esperando el save…' })
    events.onerror = () => notify({ type: 'connection', connected: false, message: 'Bridge desconectado. Reconexión automática; se conserva el último equipo.' })
    events.onmessage = event => {
      let snapshot: unknown
      try { snapshot = JSON.parse(event.data) }
      catch { snapshot = null }
      notify({ type: 'snapshot', snapshot })
    }
    return () => events.close()
  },
}
