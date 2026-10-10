import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RepelReading } from '../models/repel'
import { repelReadingStale } from '../domain/repel'
import './RepelIndicator.css'

export function RepelIndicator({ reading, stale }: { reading: RepelReading | null; stale: boolean }) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [now, setNow] = useState(() => Date.now())
  const [dismissed, setDismissed] = useState(false)
  const active = Boolean(reading && reading.steps > 0)
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  if (!reading || !active) return null
  const outdated = repelReadingStale(reading, stale, now)
  return <div className={`repel-floating${outdated ? ' stale' : ''}`} tabIndex={0} role="group" aria-label={t(outdated ? 'repel.staleLabel' : 'repel.label', { steps: reading.steps })} aria-describedby={id} data-dismissed={dismissed} onPointerEnter={() => setDismissed(false)} onFocus={() => setDismissed(false)} onKeyDown={event => { if (event.key === 'Escape') setDismissed(true) }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 9h8v12H8zM10 9V5h4v4M10 5V3h7M17 3h3M18 6l2 1M18 9l2 2M9 14h6" /></svg>
    <strong className="repel-steps" aria-hidden="true">{reading.steps}</strong>
    <span className="repel-caption">{t(outdated ? 'repel.stale' : 'repel.steps')}</span>
    <div className="repel-tooltip" id={id} role="tooltip">
      <strong>{t(outdated ? 'repel.lastKnown' : 'repel.active')}</strong>
      <p>{t(outdated ? 'repel.staleDetail' : 'repel.detail')}</p>
      <small>{t('repel.lastReading', { time: new Date(reading.updatedAt).toLocaleTimeString(i18n.language) })}</small>
    </div>
  </div>
}
