import { useTranslation } from 'react-i18next'
import type { TeamSourceState } from '../sources/team'
import type { BattleConnection } from './EnemyPrototype'
import './ConnectionIndicator.css'

export function ConnectionIndicator({ source, state, battle }: { source: 'manual' | 'save' | 'live'; state: TeamSourceState; battle: BattleConnection }) {
  const { t, i18n } = useTranslation()
  const manual = source === 'manual'
  const connected = state.connected && !state.error
  const battleConnected = battle.status === 'ready'
  const color = manual ? 'manual' : connected && (source !== 'live' || battleConnected) ? 'connected' : connected ? 'partial' : state.updatedAt || state.error ? 'disconnected' : 'waiting'
  const label = manual ? t('connectionIndicator.label.manual') : color === 'connected' ? t('connectionIndicator.label.connected') : color === 'partial' ? t('connectionIndicator.label.partial') : color === 'disconnected' ? t('connectionIndicator.label.disconnected') : t('connectionIndicator.label.waiting')
  return <>
    <button type="button" className={`connection-floating-button ${color}`} popoverTarget="connection-floating-panel" aria-label={t('connectionIndicator.statusAria', { label })} title={label}>
      <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9 16a4 4 0 0 1 6 0" /><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
        {!manual && color !== 'connected' && <path d="m4 3 16 18" />}
      </svg>
    </button>
    <div popover="auto" id="connection-floating-panel" className="connection-floating-panel" aria-labelledby="connection-floating-title">
      <strong id="connection-floating-title">{label}</strong>
      {manual ? <p>{t('connectionIndicator.manualHint')}</p> : <>
        <p><b>{t('connectionIndicator.sourceStatus', { source: source === 'live' ? t('connectionIndicator.sourceLive') : t('connectionIndicator.sourceSave'), status: connected ? t('connectionIndicator.connected') : t('connectionIndicator.noActiveReading') })}</b></p>
        <p>{state.message}</p>
        {source === 'live' && <><p><b>{t('connectionIndicator.sourceStatus', { source: t('connectionIndicator.battleLabel'), status: battleConnected ? t('connectionIndicator.connected') : battle.status === 'error' ? t('connectionIndicator.battleDisconnected') : t('connectionIndicator.battleWaiting') })}</b></p><p>{battle.message}</p></>}
        {state.updatedAt && <small>{t('connectionIndicator.lastReading', { time: new Date(state.updatedAt).toLocaleTimeString(i18n.language) })}</small>}
      </>}
      <button type="button" popoverTarget="connection-floating-panel" popoverTargetAction="hide" onClick={() => {
        const controls = document.getElementById('connection-settings')
        const details = controls?.closest('details')
        if (details) details.open = true
        controls?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })
      }}>{t('connectionIndicator.goToControlsButton')}</button>
    </div>
  </>
}
