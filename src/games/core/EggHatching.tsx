import { useTranslation } from 'react-i18next'
import { eggHatching, eggHatchingProgress } from '../../domain/egg-hatching'
import './EggHatching.css'

export function EggHatching({ cycles, initialCycles, stepsPerCycle, inParty }: { cycles?: number; initialCycles?: number; stepsPerCycle?: number; inParty: boolean }) {
  const { t, i18n } = useTranslation()
  const progress = eggHatching(cycles, stepsPerCycle)
  const bar = eggHatchingProgress(cycles, initialCycles)
  return <div className="egg-hatching">
    <strong>{t('eggHatching.title')}</strong>
    {bar && <div className="egg-hatching-progress"><span>{t('eggHatching.percent', { percent: bar.percent })}</span><progress aria-label={t('eggHatching.progressLabel')} aria-valuetext={t('eggHatching.percent', { percent: bar.percent })} title={t('eggHatching.progressHint')} value={bar.value} max={bar.max} /></div>}
    <p>{progress ? t(progress.cycles === 0 ? 'eggHatching.soon' : 'eggHatching.cycles', { count: progress.cycles }) : t('eggHatching.unavailable')}</p>
    {inParty && progress?.steps && <><p className="egg-hatching-steps">{t('eggHatching.steps', { min: progress.steps.min.toLocaleString(i18n.language), max: progress.steps.max.toLocaleString(i18n.language) })}</p><small>{t('eggHatching.estimateHint')}</small></>}
    {!inParty && <small>{t('eggHatching.boxHint')}</small>}
  </div>
}
