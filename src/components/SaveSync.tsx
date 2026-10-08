import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { disconnectLive } from '../sources/live'
import type { TeamSourceState } from '../sources/team'
import { noticeText, toNotice } from '../i18n/notice.ts'
import type { Notice } from '../i18n/notice.ts'
import type { ReaderStatus as Status } from '../domain/reader-status'
import { ReaderStatus } from './ReaderStatus'
import './SaveSync.css'

export function SaveSync({ source, onChange, state, onConnect, connecting, generalStatus, battleStatus, generalMessage, battleMessage }: {
  source: 'manual' | 'save' | 'live'; onChange: (source: 'manual' | 'save' | 'live') => void; state: TeamSourceState
  onConnect: () => void; connecting: boolean; generalStatus: Status; battleStatus: Status; generalMessage: string; battleMessage: string
}) {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Notice>(null)
  async function pause() {
    setBusy(true)
    setError(null)
    try { await disconnectLive() }
    catch (cause) { setError(toNotice(cause, 'saveSync.connectError')) }
    finally { setBusy(false) }
  }
  return <section id="connection-settings" className="panel save-sync" aria-label={t('saveSync.sourceLabel')}>
    <label>{t('saveSync.sourceLabel')} <select value={source} onChange={event => { setError(null); onChange(event.target.value as 'manual' | 'save' | 'live') }}><option value="manual">{t('saveSync.sourceManual')}</option><option value="save">{t('saveSync.sourceSave')}</option><option value="live">{t('saveSync.sourceLive')}</option></select></label>
    {source === 'save' && <div className={state.error ? 'sync-error' : 'sync-status'} role="status"><strong>{t('connectionIndicator.sourceStatus', { source: 'melonDS', status: state.connected ? t('connectionIndicator.connected') : t('connectionIndicator.noActiveReading') })}</strong><p>{noticeText(t, state.message)}</p>{state.updatedAt && <small>{t('saveSync.lastValidReading', { time: new Date(state.updatedAt).toLocaleTimeString(i18n.language) })}</small>}</div>}
    {source === 'live' && <>
      <div className="live-controls"><button className="primary" disabled={busy || connecting} onClick={() => { setError(null); onConnect() }}>{connecting ? t('readerConnections.connecting') : state.updatedAt ? t('readerConnections.reconnect') : t('readerConnections.connect')}</button><button disabled={busy || connecting} onClick={() => { void pause() }}>{t('readerConnections.pauseGeneral')}</button></div>
      <div className="live-reader-statuses"><ReaderStatus compact reader="general" status={generalStatus} message={generalMessage}
        detail={state.updatedAt ? `${t('saveSync.lastValidReading', { time: new Date(state.updatedAt).toLocaleTimeString(i18n.language) })}${!state.connected ? ` · ${t('saveSync.staleDataHint')}` : ''}` : undefined}
        hint={t('saveSync.liveHint')} /><ReaderStatus compact reader="battle" status={battleStatus} message={battleMessage} /></div>
    </>}
    {error && source === 'live' && <p className="notice" role="alert">{noticeText(t, error)}</p>}
    {source === 'save' && <p className="hint"><Trans key={i18n.language} i18nKey="saveSync.saveHint" components={{ configFile: <code />, bridgeCommand: <code /> }} /></p>}
  </section>
}
