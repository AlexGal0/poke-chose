import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { AcquisitionTag } from '../domain/acquisition'
import { acquisitionLabel } from '../i18n/acquisition.ts'
import './AcquisitionIcons.css'

export function AcquisitionIcons({ tags, error, onRetry }: { tags?: AcquisitionTag[]; error?: boolean; onRetry: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  if (error) return <div className="acquisition-icons"><button className="acquisition-icon" type="button" onClick={onRetry} aria-label={t('acquisitionIcons.retryError')} title={t('acquisitionIcons.retryError')}><span aria-hidden="true">↻</span></button></div>
  return <div className="acquisition-icons" role="group" aria-label={t('acquisitionIcons.groupAria')}>
    {(tags ?? [{ kind: 'loading', icon: '⌛' } as const]).map(tag => {
      const label = tag.kind === 'loading' ? t('acquisitionIcons.loadingLabel') : acquisitionLabel(t, tag.kind)
      return <span className="acquisition-icon" key={tag.kind} tabIndex={0} aria-label={label} aria-describedby={`${id}-${tag.kind}`} data-acquisition={tag.kind}>
        <span aria-hidden="true">{tag.icon}</span><span className="acquisition-tooltip" role="tooltip" id={`${id}-${tag.kind}`}>{label}</span>
      </span>
    })}
  </div>
}
