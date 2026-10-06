import { useEffect, useState } from 'react'
import { consistentBattleHealth } from '../domain/enemy-prototype'
import type { EnemyCandidate, ActivePokemonCandidate, BattleTeamMember } from '../domain/enemy-prototype'
import { BattlePokemon } from './BattlePokemon'
import { BattleTypeMatchup } from './BattleTypeMatchup'
import { BattleTeam } from './BattleTeam'
import { useBattlePokemon } from '../hooks/useBattlePokemon'
import { consistentStatStages } from '../domain/battle-stat-stages'
import { emptyBattleSession, updateBattleSession } from '../domain/battle-session'
import './EnemyPrototype.css'
interface EnemySnapshot {
  status: string
  message: string
  candidates: EnemyCandidate[]
  updatedAt: string | null
  activeCandidates?: ActivePokemonCandidate[]
  activeMessage?: string
  enemyVitalsCandidates?: EnemyCandidate[]
  battleTeam?: BattleTeamMember[] | null
  battleActive?: boolean | null
}

export interface BattleConnection { status: string; message: string; inBattle: boolean }

export function EnemyPrototype({ onConnectionChange }: { onConnectionChange?: (connection: BattleConnection) => void }) {
  const [snapshot, setSnapshot] = useState<EnemySnapshot | null>(null)
  const [error, setError] = useState('')
  const [reconnecting, setReconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [session, setSession] = useState(emptyBattleSession)
  const connectionStatus = error ? 'error' : snapshot?.status ?? 'waiting'
  const connectionMessage = error || snapshot?.message || 'Esperando el lector de combate.'
  async function reconnect() {
    setReconnecting(true)
    setConnectionError('')
    try {
      const response = await fetch('/enemy-api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const result = await response.json().catch(() => null) as { message?: string } | null
      if (!response.ok) throw new Error(result?.message || 'No se pudo reconectar el lector de combate.')
      setError('')
      setSnapshot(null)
    } catch (cause) {
      setConnectionError(cause instanceof Error ? cause.message : 'No se pudo reconectar el lector de combate.')
    } finally { setReconnecting(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const response = await fetch('/enemy-api/snapshot', { signal: controller.signal })
        if (!response.ok) throw new Error('El prototipo de lectura del enemigo no está disponible.')
        const next = await response.json() as EnemySnapshot
        if (!Array.isArray(next.candidates) || typeof next.message !== 'string') throw new Error('Respuesta del prototipo inválida.')
        if (!controller.signal.aborted) {
          setSnapshot(next)
          setSession(previous => updateBattleSession(previous, next))
          setError('')
        }
      } catch (cause) {
        if (!controller.signal.aborted) { setSnapshot(null); setError(cause instanceof Error ? cause.message : 'No se pudo leer el prototipo.') }
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000)
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [])
  const candidates = snapshot?.status === 'ready' ? snapshot.candidates : []
  const candidate = session.enemy
  const inBattle = session.inBattle
  useEffect(() => {
    onConnectionChange?.({ status: connectionStatus, message: connectionMessage, inBattle })
  }, [onConnectionChange, connectionStatus, connectionMessage, inBattle])
  const activeCandidate = session.own
  const enemyIdentity = candidate ? `${candidate.personality}:${candidate.trainerId}:${candidate.speciesId}:${candidate.form}` : null
  const ownData = useBattlePokemon(activeCandidate)
  const enemyData = useBattlePokemon(candidate)
  const ownHealth = consistentBattleHealth(activeCandidate, snapshot?.activeCandidates ?? [])
  const enemyHealth = consistentBattleHealth(candidate, snapshot?.enemyVitalsCandidates ?? [])
  const ownStages = consistentStatStages(activeCandidate, snapshot?.activeCandidates ?? [])
  const enemyStages = consistentStatStages(candidate, candidates)
  const disconnected = Boolean(error) || snapshot?.status === 'error'
  return <section className="panel battle-panel" aria-labelledby="enemy-prototype-title">
    <div className="section-heading"><div><span className="eyebrow">COMBATE / PROTOTIPO 5</span><h2 id="enemy-prototype-title">Pokémon en combate</h2></div><span className="count">Experimental</span></div>
    <div role="status" className={`enemy-prototype-status ${candidate ? 'detected' : ''}`}>
      <strong>{disconnected ? 'Lector de combate desconectado' : activeCandidate ? 'Ambos Pokémon detectados' : candidate ? 'Rival detectado' : snapshot?.status === 'ready' ? 'Sin rival confirmado' : 'Esperando lectura'}</strong>
      <span>{error || (activeCandidate ? 'Tu Pokémon se identifica por el ejemplar que está en el campo.' : candidate ? 'Esperando una lectura coincidente de tu Pokémon activo.' : snapshot?.status === 'ready' ? 'Fuera de combate o sin una lectura coincidente. No se muestra el rival anterior.' : snapshot?.message || 'Conectando al prototipo…')}</span>
    </div>
    {(disconnected || snapshot?.status === 'waiting') && <div className="enemy-prototype-controls"><button className="primary" disabled={reconnecting} onClick={() => { void reconnect() }}>{reconnecting ? 'Conectando…' : disconnected ? 'Reconectar combate' : 'Conectar combate'}</button></div>}
    {connectionError && <p className="notice" role="alert">{connectionError}</p>}
    {candidate && <div className="battle-participants">
      {activeCandidate ? <BattlePokemon candidate={activeCandidate} pokemon={ownData.pokemon} error={ownData.error} health={ownHealth} stages={ownStages} own /> : <div className="battle-participant own-participant"><h3 className="battle-participant-title">Tu Pokémon activo</h3><div className="battle-participant-empty"><strong>Por confirmar</strong><p className="hint">{snapshot?.activeMessage || 'Aún no hay una lectura válida del Pokémon en el campo.'}</p></div></div>}
      <BattlePokemon candidate={candidate} pokemon={enemyData.pokemon} error={enemyData.error} health={enemyHealth} stages={enemyStages} />
      <BattleTypeMatchup own={ownData.pokemon} enemy={enemyData.pokemon} direction="outgoing" />
      <BattleTypeMatchup own={ownData.pokemon} enemy={enemyData.pokemon} direction="incoming" />
    </div>}
    {candidate && <BattleTeam key={enemyIdentity} members={session.team} active={activeCandidate} enemy={enemyData.pokemon} />}
    <details className="battle-reading-details"><summary>Información de la lectura y los multiplicadores</summary>
      <p className="hint">Tu Pokémon activo, el rival y la salud de tu equipo en combates individuales. Lectura experimental de melonDS.</p>
      <p className="hint">Cada multiplicador corresponde a un ataque de ese tipo contra los tipos del defensor. No incluye STAB, movimientos, habilidades ni objetos.</p>
      <p className="hint">Las debilidades muestran todos los tipos que hacen daño supereficaz a ese Pokémon en Generación V, aunque el oponente no tenga ese tipo.</p>
      <p className="hint">Las fortalezas muestran resistencias (0.5× o 0.25×) e inmunidades (0×) por tipo. Los cambios de estadísticas se conservan durante lecturas transitorias y se actualizan al confirmarse una nueva lectura.</p>
    </details>
  </section>
}
