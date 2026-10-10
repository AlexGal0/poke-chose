import { useTranslation } from 'react-i18next'
import { useId, useState } from 'react'
import type { ReaderStatus as Status } from '../domain/reader-status'
import { readerStatusLabel } from '../i18n/reader-status'
import './ReaderStatus.css'

export function ReaderStatus({ reader, status, message, compact = false, detail, hint }: {
  reader: 'general' | 'battle'; status: Status; message?: string; compact?: boolean; detail?: string; hint?: string
}) {
  const { t } = useTranslation()
  const id = useId()
  const [dismissed, setDismissed] = useState(false)
  const label = t(`readerConnections.${reader}`)
  const statusLabel = readerStatusLabel(t, status)
  const contents = <>
    <div className="reader-status-heading"><strong>{label}</strong><span className="reader-status-badge"><i aria-hidden="true" />{statusLabel}</span></div>
    {status === 'connecting' ? <p>{t('readerConnections.connectingDetail')}</p> : message && <p>{message}</p>}
    {detail && <p>{detail}</p>}
    {hint && <p>{hint}</p>}
  </>
  if (compact) return <div className={`reader-status-compact reader-status-${status}`} data-dismissed={dismissed}>
    <button type="button" className="reader-status-trigger" aria-label={`${label}: ${statusLabel}`} aria-describedby={id} onPointerEnter={() => setDismissed(false)} onFocus={() => setDismissed(false)} onKeyDown={event => { if (event.key === 'Escape') setDismissed(true) }}>
      <span className="reader-status-badge"><i aria-hidden="true" />{t(`readerConnections.short.${reader}`)}</span>
    </button>
    <div id={id} className="reader-status reader-status-tooltip" role="tooltip">{contents}</div>
  </div>
  return <div className={`reader-status reader-status-${status}`} role="status">
    {contents}
  </div>
}
