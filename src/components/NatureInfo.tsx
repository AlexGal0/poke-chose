import { useTranslation } from 'react-i18next'
import { natureDetails } from '../domain/nature'
import { natureEffectLabel, natureLabel } from '../i18n/nature'
import { statLabel } from '../i18n/stats'
import './NatureInfo.css'

export function NatureInfo({ natureId }: { natureId?: number }) {
  const { t } = useTranslation()
  const nature = natureDetails(natureId)
  return <div className="nature-info" role="group" aria-label={t('nature.heading')}>
    <p className="nature-name"><span>{t('nature.heading')}</span> <strong>{nature ? natureLabel(t, nature.id) : t('nature.unavailable')}</strong></p>
    {!nature ? <p className="nature-note">{t('nature.missingHint')}</p> : nature.kind === 'neutral' ? <p className="nature-note">{t('nature.neutral')}</p> : <div className="nature-effects">
      <span className="nature-effect nature-increased" title={natureEffectLabel(t, 'increased', nature.increased)}><span aria-hidden="true">↑ </span><span className="sr-only">{t('nature.increasedPrefix')} </span>{statLabel(t, nature.increased)}</span>
      <span className="nature-effect nature-decreased" title={natureEffectLabel(t, 'decreased', nature.decreased)}><span aria-hidden="true">↓ </span><span className="sr-only">{t('nature.decreasedPrefix')} </span>{statLabel(t, nature.decreased)}</span>
    </div>}
  </div>
}
