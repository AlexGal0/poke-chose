import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

type Notice = { key: string } | { raw: string } | null

class KeyedError extends Error {
  key: string
  constructor(key: string) {
    super(key)
    this.key = key
  }
}

function toNotice(cause: unknown, fallbackKey: string): Notice {
  if (cause instanceof KeyedError) return { key: cause.key }
  if (cause instanceof Error) return { raw: cause.message }
  return { key: fallbackKey }
}

export interface BattleConnection { status: string; message: string; inBattle: boolean }

export function EnemyPrototype({ onConnectionChange }: { onConnectionChange?: (connection: BattleConnection) => void }) {
  const { t } = useTranslation()
  const noticeText = (notice: Notice): string | null => notice && (('key' in notice) ? t(notice.key) : notice.raw)
  const [snapshot, setSnapshot] = useState<EnemySnapshot | null>(null)
  const [error, setError] = useState<Notice>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<Notice>(null)
  const [session, setSession] = useState(emptyBattleSession)
  const connectionStatus = error ? 'error' : snapshot?.status ?? 'waiting'
  const connectionMessage = noticeText(error) || snapshot?.message || t('app.battleWaitingMessage')
  async function reconnect() {
    setReconnecting(true)
    setConnectionError(null)
    try {
      const response = await fetch('/enemy-api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const result = await response.json().catch(() => null) as { message?: string } | null
      if (!response.ok) throw result?.message ? new Error(result.message) : new KeyedError('enemyPrototype.errors.reconnectFailed')
      setError(null)
      setSnapshot(null)
    } catch (cause) {
      setConnectionError(toNotice(cause, 'enemyPrototype.errors.reconnectFailed'))
    } finally { setReconnecting(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const response = await fetch('/enemy-api/snapshot', { signal: controller.signal })
        if (!response.ok) throw new KeyedError('enemyPrototype.errors.prototypeUnavailable')
        const next = await response.json() as EnemySnapshot
        if (!Array.isArray(next.candidates) || typeof next.message !== 'string') throw new KeyedError('enemyPrototype.errors.invalidResponse')
        if (!controller.signal.aborted) {
          setSnapshot(next)
          setSession(previous => updateBattleSession(previous, next))
          setError(null)
        }
      } catch (cause) {
        if (!controller.signal.aborted) { setSnapshot(null); setError(toNotice(cause, 'enemyPrototype.errors.readFailed')) }
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
    <div className="section-heading"><div><span className="eyebrow">{t('enemyPrototype.eyebrow')}</span><h2 id="enemy-prototype-title">{t('enemyPrototype.heading')}</h2></div><span className="count">{t('enemyPrototype.experimentalBadge')}</span></div>
    <div role="status" className={`enemy-prototype-status ${candidate ? 'detected' : ''}`}>
      <strong>{disconnected ? t('enemyPrototype.status.disconnected') : activeCandidate ? t('enemyPrototype.status.bothDetected') : candidate ? t('enemyPrototype.status.rivalDetected') : snapshot?.status === 'ready' ? t('enemyPrototype.status.noRivalConfirmed') : t('enemyPrototype.status.waitingRead')}</strong>
      <span>{noticeText(error) || (activeCandidate ? t('enemyPrototype.detail.ownIdentified') : candidate ? t('enemyPrototype.detail.waitingMatch') : snapshot?.status === 'ready' ? t('enemyPrototype.detail.outOfBattle') : snapshot?.message || t('enemyPrototype.detail.connecting'))}</span>
    </div>
    {(disconnected || snapshot?.status === 'waiting') && <div className="enemy-prototype-controls"><button className="primary" disabled={reconnecting} onClick={() => { void reconnect() }}>{reconnecting ? t('enemyPrototype.button.connecting') : disconnected ? t('enemyPrototype.button.reconnect') : t('enemyPrototype.button.connect')}</button></div>}
    {connectionError && <p className="notice" role="alert">{noticeText(connectionError)}</p>}
    {candidate && <div className="battle-participants">
      {activeCandidate ? <BattlePokemon candidate={activeCandidate} pokemon={ownData.pokemon} error={ownData.error} health={ownHealth} stages={ownStages} own /> : <div className="battle-participant own-participant"><h3 className="battle-participant-title">{t('enemyPrototype.ownTitle')}</h3><div className="battle-participant-empty"><strong>{t('enemyPrototype.toBeConfirmed')}</strong><p className="hint">{snapshot?.activeMessage || t('enemyPrototype.noActiveReading')}</p></div></div>}
      <BattlePokemon candidate={candidate} pokemon={enemyData.pokemon} error={enemyData.error} health={enemyHealth} stages={enemyStages} />
      <BattleTypeMatchup own={ownData.pokemon} enemy={enemyData.pokemon} direction="outgoing" />
      <BattleTypeMatchup own={ownData.pokemon} enemy={enemyData.pokemon} direction="incoming" />
    </div>}
    {candidate && <BattleTeam key={enemyIdentity} members={session.team} active={activeCandidate} enemy={enemyData.pokemon} />}
    <details className="battle-reading-details"><summary>{t('enemyPrototype.detailsSummary')}</summary>
      <p className="hint">{t('enemyPrototype.hints.overview')}</p>
      <p className="hint">{t('enemyPrototype.hints.multiplier')}</p>
      <p className="hint">{t('enemyPrototype.hints.weaknesses')}</p>
      <p className="hint">{t('enemyPrototype.hints.strengths')}</p>
    </details>
  </section>
}
