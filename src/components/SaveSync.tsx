import { useState } from 'react'
import { liveDataSource, disconnectLive } from '../sources/live'
import type { TeamSourceState } from '../sources/team'
import './SaveSync.css'

export function SaveSync({ source, onChange, state }: { source: 'manual' | 'save' | 'live'; onChange: (source: 'manual' | 'save' | 'live') => void; state: TeamSourceState }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function control(disconnect = false) {
    setBusy(true)
    setError('')
    try { if (disconnect) await disconnectLive(); else await liveDataSource.reconnect!() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo conectar.') }
    finally { setBusy(false) }
  }
  return <section id="connection-settings" className="panel save-sync" aria-label="Origen del equipo">
    <label>Origen del equipo <select value={source} onChange={event => { setError(''); onChange(event.target.value as 'manual' | 'save' | 'live') }}><option value="manual">Manual</option><option value="save">Save de melonDS</option><option value="live">melonDS en vivo (experimental)</option></select></label>
    {source !== 'manual' && <div className={state.error ? 'sync-error' : 'sync-status'} role="status"><strong>melonDS: {state.connected ? 'conectado' : 'sin lectura activa'}</strong><p>{state.message}</p>{state.updatedAt && <small>Última lectura válida: {new Date(state.updatedAt).toLocaleTimeString()}</small>}{source === 'live' && !state.connected && state.updatedAt && <p>Datos desactualizados. Conecta el lector para actualizarlos.</p>}</div>}
    {source === 'live' && <div className="live-controls"><button className="primary" disabled={busy} onClick={() => { void control() }}>{busy ? 'Solicitando…' : state.updatedAt ? 'Reconectar lector' : 'Conectar lector'}</button><button disabled={busy} onClick={() => { void control(true) }}>Pausar lectura</button></div>}
    {error && source === 'live' && <p className="notice" role="alert">{error}</p>}
    {source === 'live' && <p className="hint">Lee el equipo, cajas y Pokédex sin guardar. Tras Reset o reabrir melonDS, pulsa Reconectar lector. La sincronización puede tardar varios segundos.</p>}
    {source === 'save' && <p className="hint">Configura <code>save.config.local.json</code> y ejecuta <code>npm run bridge</code>. Se sincroniza cuando el juego guarda en el .sav. El equipo manual se conserva.</p>}
  </section>
}
