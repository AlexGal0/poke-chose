import { useTranslation } from 'react-i18next'
import type { TeamSourceState } from '../sources/team'
import type { ReaderStatus as Status } from '../domain/reader-status'
import { ReaderStatus } from './ReaderStatus'
import { showConnectionControls } from './connection-controls'
import { noticeText } from '../i18n/notice.ts'
import './ConnectionIndicator.css'

export function ConnectionIndicator({ source, state, generalStatus, battleStatus, generalMessage, battleMessage }: {
  source: 'manual' | 'save' | 'live'; state: TeamSourceState; generalStatus: Status; battleStatus: Status; generalMessage: string; battleMessage: string
}) {
  const { t, i18n } = useTranslation()
  const manual = source === 'manual'
  const connected = source === 'live' ? generalStatus === 'connected' : state.connected && !state.error
  const battleConnected = battleStatus === 'connected'
  const color = manual ? 'manual' : connected && (source !== 'live' || battleConnected) ? 'connected' : connected || (source === 'live' && battleConnected) ? 'partial' : source === 'live' && (generalStatus === 'connecting' || battleStatus === 'connecting') ? 'waiting' : state.updatedAt || state.error ? 'disconnected' : 'waiting'
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
        {source === 'live' ? <div className="connection-reader-statuses"><ReaderStatus reader="general" status={generalStatus} message={generalMessage} /><ReaderStatus reader="battle" status={battleStatus} message={battleMessage} /></div> : <><p><b>{t('connectionIndicator.sourceStatus', { source: t('connectionIndicator.sourceSave'), status: connected ? t('connectionIndicator.connected') : t('connectionIndicator.noActiveReading') })}</b></p><p>{noticeText(t, state.message)}</p></>}
        {state.updatedAt && <small>{t('connectionIndicator.lastReading', { time: new Date(state.updatedAt).toLocaleTimeString(i18n.language) })}</small>}
      </>}
      <button type="button" popoverTarget="connection-floating-panel" popoverTargetAction="hide" onClick={showConnectionControls}>{t('connectionIndicator.goToControlsButton')}</button>
    </div>
  </>
}
