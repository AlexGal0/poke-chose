import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConnectionActions, ConnectionStatus } from '../models/connection-status'
import { connectionStatusColor } from '../domain/connection-status'
import { readerStatusLabel } from '../i18n/reader-status'
import './ConnectionIndicator.css'
import './ReaderStatus.css'

export function ConnectionIndicator({ data, onOpenControls, actions }: { actions?: ConnectionActions; data: ConnectionStatus; onOpenControls: () => void }) {
  const { t, i18n } = useTranslation()
  const [reconnecting, setReconnecting] = useState(false)
  const [failed, setFailed] = useState(false)
  const pending = useRef(false)
  async function reconnect() {
    if (!actions || actions.busy || pending.current) return
    pending.current = true; setReconnecting(true); setFailed(false)
    try { await actions.reconnect() } catch { setFailed(true) } finally { pending.current = false; setReconnecting(false) }
  }
  const id = useId()
  const panelId = `connection-panel-${id}`
  const titleId = `connection-title-${id}`
  const color = connectionStatusColor(data)
  const label = t(`connectionIndicator.label.${color}`)
  return <>
    <button type="button" className={`connection-floating-button ${color}`} popoverTarget={panelId} aria-label={t('connectionIndicator.statusAria', { label })} title={label}>
      <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9 16a4 4 0 0 1 6 0" /><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
        {!data.manual && color !== 'connected' && <path d="m4 3 16 18" />}
      </svg>
    </button>
    <div popover="auto" id={panelId} className="connection-floating-panel" aria-labelledby={titleId}>
      <strong id={titleId}>{label}</strong>
      {data.message && <p>{data.message}</p>}
      {!data.manual && <div className="connection-reader-statuses">{data.readers.map(reader => <div key={reader.id} className={`reader-status reader-status-${reader.status}`} role="status">
        <div className="reader-status-heading"><strong>{reader.label}</strong><span className="reader-status-badge"><i aria-hidden="true" />{readerStatusLabel(t, reader.status)}</span></div>
        {reader.message && <p>{reader.message}</p>}
        {reader.updatedAt && <small>{t('connectionIndicator.readerUpdatedAt', { time: new Date(reader.updatedAt).toLocaleTimeString(i18n.language) })}</small>}
      </div>)}</div>}
      {actions && !data.manual && <button type="button" className="primary" disabled={actions.busy || reconnecting} onClick={() => { void reconnect() }}>{t(actions.busy || reconnecting ? 'connectionIndicator.reconnecting' : 'connectionIndicator.reconnect')}</button>}
      {failed && <p className="notice" role="alert">{t('connectionIndicator.reconnectFailed')}</p>}
      <button type="button" popoverTarget={panelId} popoverTargetAction="hide" onClick={onOpenControls}>{t('connectionIndicator.goToControlsButton')}</button>
    </div>
  </>
}
