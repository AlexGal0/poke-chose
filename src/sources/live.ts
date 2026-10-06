import type { PokemonDataSource } from './data-source.ts'
import { KeyedError } from '../i18n/notice.ts'

async function control(action: 'connect' | 'disconnect') {
  const response = await fetch(`/live-api/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  if (!response.ok) throw new KeyedError('sources.live.controlFailed')
}

export const liveDataSource: PokemonDataSource = {
  id: 'live', labelKey: 'sources.live.label',
  capabilities: { party: true, boxes: true, pokedex: true },
  reconnect: () => control('connect'),
  subscribe(notify) {
    const events = new EventSource('/live-api/events')
    events.onerror = () => notify({ type: 'connection', connected: false, message: { key: 'sources.live.disconnected' } })
    events.onmessage = event => {
      let snapshot: unknown
      try { snapshot = JSON.parse(event.data) } catch { snapshot = null }
      const connected = snapshot !== null && typeof snapshot === 'object' && 'status' in snapshot && snapshot.status === 'ready'
      notify({ type: 'snapshot', snapshot, connected })
    }
    return () => events.close()
  },
}

export const disconnectLive = () => control('disconnect')

export async function refreshLiveBoxes() {
  const response = await fetch('/live-api/refresh-boxes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(60000) })
  const result = await response.json().catch(() => null) as { message?: string } | null
  if (!response.ok) throw result?.message ? new Error(result.message) : new KeyedError('sources.live.refreshFailed')
}
