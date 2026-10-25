import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CombatParticipant, CombatReading, CombatService, BattleConnection } from '../models/combat'
import type { TypeRules } from '../domain/type-analysis'
import { advanceCombatSession, emptyCombatSession } from '../domain/battle-lifecycle'
import { BattlePokemon } from './BattlePokemon'
import { BattleTeam } from './BattleTeam'
import { BattleTypeMatchup } from './BattleTypeMatchup'
import { useBattlePokemon } from '../hooks/useBattlePokemon'
import { showConnectionControls } from './connection-controls'
import './EnemyPrototype.css'

export function BattleScreen({ reading, service, rules, hint, onConnectionChange }: {
  reading: CombatReading; service: CombatService; rules: TypeRules; hint?: string; onConnectionChange?: (connection: BattleConnection) => void
}) {
  const { t } = useTranslation()
  const [stored, setStored] = useState(() => ({ reading, session: advanceCombatSession(emptyCombatSession<CombatParticipant, CombatParticipant[]>(), reading) }))
  const session = stored.reading === reading ? stored.session : advanceCombatSession(stored.session, reading)
  if (stored.reading !== reading) setStored({ reading, session })
  const candidate = session.enemy, activeCandidate = session.own
  const ownData = useBattlePokemon(activeCandidate, service), enemyData = useBattlePokemon(candidate, service)
  const disconnected = reading.status === 'error'
  useEffect(() => {
    onConnectionChange?.({ status: reading.status, message: reading.message, inBattle: session.inBattle })
  }, [onConnectionChange, reading.status, reading.message, session.inBattle])
  return <section className="panel battle-panel" aria-labelledby="enemy-prototype-title">
    <div className="section-heading"><div><span className="eyebrow">{t('enemyPrototype.eyebrow')}</span><h2 id="enemy-prototype-title">{t('enemyPrototype.heading')}</h2></div><span className="count">{t('enemyPrototype.experimentalBadge')}</span></div>
    {hint && <p className="hint">{hint}</p>}
    <div role="status" className={`enemy-prototype-status ${candidate ? 'detected' : ''} ${disconnected ? 'stale' : ''}`} >
      <strong>{disconnected ? t('enemyPrototype.status.disconnected') : activeCandidate ? t('enemyPrototype.status.bothDetected') : candidate ? t('enemyPrototype.status.rivalDetected') : reading.status === 'ready' ? t('enemyPrototype.status.noRivalConfirmed') : t('enemyPrototype.status.waitingRead')}</strong>
      <span>{reading.message || (activeCandidate ? t('enemyPrototype.detail.ownIdentified') : candidate ? t('enemyPrototype.detail.waitingMatch') : reading.status === 'ready' ? t('enemyPrototype.detail.outOfBattle') : t('enemyPrototype.detail.connecting'))}</span>
    </div>
    {(disconnected || reading.status !== 'ready') && <div className="enemy-prototype-controls"><button onClick={showConnectionControls}>{t('connectionIndicator.goToControlsButton')}</button></div>}
    {session.inBattle && reading.status === 'ready' && reading.active === null && <p className="notice" role="status">{t('battleShared.partial')}</p>}
    {candidate && <div className="battle-participants">
      {activeCandidate ? <BattlePokemon candidate={activeCandidate} pokemon={ownData.pokemon} service={service} error={ownData.error} health={activeCandidate.health} stages={activeCandidate.stages} own /> : <div className="battle-participant own-participant"><h3 className="battle-participant-title">{t('enemyPrototype.ownTitle')}</h3><div className="battle-participant-empty"><strong>{t('enemyPrototype.toBeConfirmed')}</strong><p className="hint">{t('enemyPrototype.noActiveReading')}</p></div></div>}
      <BattlePokemon candidate={candidate} pokemon={enemyData.pokemon} service={service} error={enemyData.error} health={candidate.health} stages={candidate.stages} />
      <BattleTypeMatchup rules={rules} own={ownData.pokemon} enemy={enemyData.pokemon} direction="outgoing" />
      <BattleTypeMatchup rules={rules} own={ownData.pokemon} enemy={enemyData.pokemon} direction="incoming" />
    </div>}
    {candidate && <BattleTeam key={candidate.identity} members={session.team} active={activeCandidate} enemy={enemyData.pokemon} service={service} rules={rules} />}
    <details className="battle-reading-details"><summary>{t('enemyPrototype.detailsSummary')}</summary>
      <p className="hint">{t('enemyPrototype.hints.overview')}</p><p className="hint">{t('enemyPrototype.hints.multiplier')}</p><p className="hint">{t('enemyPrototype.hints.weaknesses', { generation: rules.generation })}</p><p className="hint">{t('enemyPrototype.hints.strengths')}</p>
    </details>
  </section>
}
