import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getEvolutionFamily, getEvolutionSpecies } from '../api/evolution'
import { daycareEvolutionAlert, nextEvolutionLevel } from '../domain/daycare-evolution'
import { EvolutionContext } from './evolution-context'

export function DaycareEvolution({ speciesId, level, stepsRemaining }: { speciesId: number; level: number | null; stepsRemaining: number | null }) {
  const { t } = useTranslation()
  const openEvolution = useContext(EvolutionContext)
  const [target, setTarget] = useState<{ speciesId: number; level: number | null } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getEvolutionSpecies(speciesId, controller.signal).then(species => getEvolutionFamily(species, controller.signal)).then(root => {
      if (!controller.signal.aborted) setTarget({ speciesId, level: nextEvolutionLevel(root, speciesId) })
    }).catch(() => { /* Do not invent a level when evolution data is unavailable. */ })
    return () => controller.abort()
  }, [speciesId])
  if (level == null || target?.speciesId !== speciesId || target.level == null) return null
  const remaining = Math.max(0, target.level - level)
  const alert = daycareEvolutionAlert(level, target.level, stepsRemaining)
  const label = t(remaining ? 'daycare.evolutionRemaining' : 'daycare.evolutionReached', { count: remaining, level: target.level })
  return <>
    <button className={`daycare-evolution${alert ? ' daycare-evolution-highlight' : ''}`} onClick={() => openEvolution(speciesId)} aria-label={`${label}. ${t('daycare.evolutionHint')}`} title={`${label}. ${t('daycare.evolutionHint')}`}>
    <span aria-hidden="true">↗</span><strong>{remaining}</strong>
    </button>
    {alert && <p role="status" className={`daycare-evolution-alert daycare-evolution-alert-${alert}`}>
      <span aria-hidden="true">{alert === 'soon' ? '↗' : '✓'}</span> {t(`daycare.evolutionAlert.${alert}`, { level: target.level, steps: stepsRemaining })}
    </p>}
  </>
}
