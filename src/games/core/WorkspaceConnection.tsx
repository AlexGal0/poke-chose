import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { connectionStatusColor } from '../../domain/connection-status'
import type { ConnectionActions, ConnectionStatus } from '../../models/connection-status'
import type { SourceMode } from '../../components/SourceModeSelect'

export function WorkspaceConnection({ source, status, actions, controls }: {
  source: SourceMode
  status?: ConnectionStatus
  actions?: ConnectionActions
  controls?: ReactNode
}) {
  const { t } = useTranslation()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const color = status ? connectionStatusColor(status) : source === 'manual' ? 'manual' : 'waiting'
  async function reconnect() {
    if (!actions || actions.busy || pending.current) return
    pending.current = true
    setBusy(true)
    setFailed(false)
    try { await actions.reconnect() } catch { setFailed(true) } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return <section className={`workspace-connection-panel connection-${color}`} aria-label={t('app.connectionSettingsSummary')}>
    <details className="connection-settings compact workspace-connection">
      <summary>
        <span className="workspace-connection-title">{t(`workspaceShell.sources.${source}`)}</span>
        <span className="workspace-reader-state" role="status"><i aria-hidden="true" />{t(`connectionIndicator.label.${color}`)}</span>
        <span className="workspace-connection-toggle">{t('workspaceShell.connectionDetails')} <span aria-hidden="true">⌄</span></span>
      </summary>
      <div className="workspace-connection-body">{controls}</div>
    </details>
    {actions && !status?.manual && <button type="button" className="workspace-reconnect primary" disabled={actions.busy || busy} onClick={() => { void reconnect() }}>{t(actions.busy || busy ? 'connectionIndicator.reconnecting' : 'connectionIndicator.reconnect')}</button>}
    {failed && <p className="notice" role="alert">{t('connectionIndicator.reconnectFailed')}</p>}
  </section>
}
