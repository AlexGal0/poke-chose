import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { AcquisitionRoute, AcquisitionText } from '../games/core/acquisition'
import { acquisitionText } from '../i18n/acquisition-text'
import './AcquisitionIcons.css'

export function AcquisitionIcons({ tags, groupLabel, error, onRetry, onDetails }: { tags?: readonly AcquisitionRoute[]; groupLabel: AcquisitionText; error?: boolean; onRetry: () => void; onDetails?: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  if (error) return <div className="acquisition-icons"><button className="acquisition-icon" type="button" onClick={onRetry} aria-label={t('acquisitionIcons.retryError')} title={t('acquisitionIcons.retryError')}><span aria-hidden="true">↻</span></button></div>
  return <div className="acquisition-icons" role="group" aria-label={acquisitionText(t, groupLabel)}>
    {(tags ?? [{ kind: 'loading', icon: '⌛', label: { key: 'acquisitionIcons.loadingLabel' } }]).map(tag => {
      const label = acquisitionText(t, tag.label)
      if (onDetails) return <button type="button" className="acquisition-icon" key={tag.kind} onClick={onDetails} aria-label={label} aria-describedby={`${id}-${tag.kind}`} data-acquisition={tag.kind}>
        <span aria-hidden="true">{tag.icon}</span><span className="acquisition-tooltip" role="tooltip" id={`${id}-${tag.kind}`}>{label}</span>
      </button>
      return <span className="acquisition-icon" key={tag.kind} tabIndex={0} aria-label={label} aria-describedby={`${id}-${tag.kind}`} data-acquisition={tag.kind}>
        <span aria-hidden="true">{tag.icon}</span><span className="acquisition-tooltip" role="tooltip" id={`${id}-${tag.kind}`}>{label}</span>
      </span>
    })}
  </div>
}
