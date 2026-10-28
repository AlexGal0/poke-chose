import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CombatParticipant, CombatReading, CombatService, BattleConnection } from '../models/combat'
import type { TypeRules } from '../domain/type-analysis'
import { advanceCombatSession, emptyCombatSession } from '../domain/battle-lifecycle'
import { BattlePokemon } from './BattlePokemon'
import { BattleTeam } from './BattleTeam'
import { BattleOpponentRoster } from './BattleOpponentRoster'
import { BattleTypeMatchup } from './BattleTypeMatchup'
import { useBattlePokemon } from '../hooks/useBattlePokemon'
import { showConnectionControls } from './connection-controls'
import './EnemyPrototype.css'
import type { FieldCombatReading } from '../games/core/combat'
import type { CombatPresentation } from '../games/core/combat-presentation'
import { BattleField } from './BattleField'
import { advanceFieldCombatSession, emptyFieldCombatSession } from '../domain/field-combat-session'

interface BattleScreenProps {
  reading: CombatReading; service: CombatService; rules: TypeRules; hint?: string; onConnectionChange?: (connection: BattleConnection) => void
  fieldReading?: FieldCombatReading
  presentation?: CombatPresentation
}

export function BattleScreen({ fieldReading, ...props }: BattleScreenProps) {
  return fieldReading ? <FieldBattleScreen reading={fieldReading} service={props.service} rules={props.rules} hint={props.hint} onConnectionChange={props.onConnectionChange} presentation={props.presentation} /> : <SingleBattleScreen {...props} />
}

export function FieldBattleScreen({ reading, service, rules, hint, presentation, onConnectionChange }: { reading: FieldCombatReading; service: CombatService; rules: TypeRules; hint?: string; presentation?: CombatPresentation; onConnectionChange?: (connection: BattleConnection) => void }) {
  const { t } = useTranslation()
  const [stored, setStored] = useState(() => ({ reading, session: advanceFieldCombatSession(emptyFieldCombatSession(), reading) }))
  const session = stored.reading === reading ? stored.session : advanceFieldCombatSession(stored.session, reading)
  if (stored.reading !== reading) setStored({ reading, session })
  useEffect(() => {
    onConnectionChange?.({ status: reading.status, message: '', inBattle: session.inBattle })
  }, [onConnectionChange, reading.status, session.inBattle])
  return <section className="panel battle-panel" aria-label={t('enemyPrototype.heading')}>
    <div className="section-heading"><h2>{t('enemyPrototype.heading')}</h2><span className="count">{t('enemyPrototype.experimentalBadge')}</span></div>
    {hint && <p className="hint">{hint}</p>}
    {(reading.status !== 'ready' || session.stale) && <p className="notice" role="status">{t(reading.status === 'error' ? 'enemyPrototype.status.disconnected' : 'battleShared.partial')}</p>}
    {reading.status !== 'ready' && <button onClick={showConnectionControls}>{t('connectionIndicator.goToControlsButton')}</button>}
    {!session.inBattle && reading.status === 'ready' && reading.activity === 'inactive' ? <p role="status">{t('enemyPrototype.detail.outOfBattle')}</p> : session.field ? <BattleField key={session.revision} field={session.field} service={service} rules={rules} presentation={presentation} playerTeam={session.playerTeam} stale={session.stale} /> : <p role="status">{t('enemyPrototype.status.waitingRead')}</p>}
  </section>
}

function SingleBattleScreen({ reading, service, rules, hint, onConnectionChange }: BattleScreenProps) {
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
    {session.inBattle && <BattleOpponentRoster total={session.opponentRosterTotal ?? null} stale={reading.status !== 'ready' || reading.opponentRosterTotal == null} />}
    {candidate && <div className="battle-participants">
      {activeCandidate ? <BattlePokemon rules={rules} candidate={activeCandidate} pokemon={ownData.pokemon} service={service} error={ownData.error} health={activeCandidate.health} stages={activeCandidate.stages} own /> : <div className="battle-participant own-participant"><h3 className="battle-participant-title">{t('enemyPrototype.ownTitle')}</h3><div className="battle-participant-empty"><strong>{t('enemyPrototype.toBeConfirmed')}</strong><p className="hint">{t('enemyPrototype.noActiveReading')}</p></div></div>}
      <BattlePokemon rules={rules} candidate={candidate} pokemon={enemyData.pokemon} service={service} error={enemyData.error} health={candidate.health} stages={candidate.stages} />
      <BattleTypeMatchup rules={rules} own={ownData.pokemon} enemy={enemyData.pokemon} direction="outgoing" />
      <BattleTypeMatchup rules={rules} own={ownData.pokemon} enemy={enemyData.pokemon} direction="incoming" />
    </div>}
    {candidate && <BattleTeam capacity={6} key={candidate.identity} members={session.team} active={activeCandidate} enemy={enemyData.pokemon} service={service} rules={rules} />}
    <details className="battle-reading-details"><summary>{t('enemyPrototype.detailsSummary')}</summary>
      <p className="hint">{t('enemyPrototype.hints.overview')}</p><p className="hint">{t('enemyPrototype.hints.multiplier')}</p><p className="hint">{t('enemyPrototype.hints.weaknesses', { generation: rules.generation })}</p><p className="hint">{t('enemyPrototype.hints.strengths')}</p>
    </details>
  </section>
}
