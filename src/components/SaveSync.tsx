import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { liveDataSource, disconnectLive } from '../sources/live'
import type { TeamSourceState } from '../sources/team'
import { noticeText } from '../i18n/notice.ts'
import type { Notice } from '../i18n/notice.ts'
import './SaveSync.css'

export function SaveSync({ source, onChange, state }: { source: 'manual' | 'save' | 'live'; onChange: (source: 'manual' | 'save' | 'live') => void; state: TeamSourceState }) {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Notice>(null)
  async function control(disconnect = false) {
    setBusy(true)
    setError(null)
    try { if (disconnect) await disconnectLive(); else await liveDataSource.reconnect!() }
    catch (cause) { setError(cause instanceof Error ? { raw: cause.message } : { key: 'saveSync.connectError' }) }
    finally { setBusy(false) }
  }
  return <section id="connection-settings" className="panel save-sync" aria-label={t('saveSync.sourceLabel')}>
    <label>{t('saveSync.sourceLabel')} <select value={source} onChange={event => { setError(null); onChange(event.target.value as 'manual' | 'save' | 'live') }}><option value="manual">{t('saveSync.sourceManual')}</option><option value="save">{t('saveSync.sourceSave')}</option><option value="live">{t('saveSync.sourceLive')}</option></select></label>
    {source !== 'manual' && <div className={state.error ? 'sync-error' : 'sync-status'} role="status"><strong>{t('connectionIndicator.sourceStatus', { source: 'melonDS', status: state.connected ? t('connectionIndicator.connected') : t('connectionIndicator.noActiveReading') })}</strong><p>{noticeText(t, state.message)}</p>{state.updatedAt && <small>{t('saveSync.lastValidReading', { time: new Date(state.updatedAt).toLocaleTimeString(i18n.language) })}</small>}{source === 'live' && !state.connected && state.updatedAt && <p>{t('saveSync.staleDataHint')}</p>}</div>}
    {source === 'live' && <div className="live-controls"><button className="primary" disabled={busy} onClick={() => { void control() }}>{busy ? t('saveSync.button.requesting') : state.updatedAt ? t('saveSync.button.reconnect') : t('saveSync.button.connect')}</button><button disabled={busy} onClick={() => { void control(true) }}>{t('saveSync.button.pause')}</button></div>}
    {error && source === 'live' && <p className="notice" role="alert">{noticeText(t, error)}</p>}
    {source === 'live' && <p className="hint">{t('saveSync.liveHint')}</p>}
    {source === 'save' && <p className="hint"><Trans key={i18n.language} i18nKey="saveSync.saveHint" components={{ configFile: <code />, bridgeCommand: <code /> }} /></p>}
  </section>
}
