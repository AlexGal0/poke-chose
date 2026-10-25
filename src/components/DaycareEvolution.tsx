import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DaycareService } from '../games/core/daycare'
import { daycareEvolutionAlert } from '../domain/daycare-evolution'

export function DaycareEvolution({ speciesId, level, stepsRemaining, service, onOpenEvolution }: { service: DaycareService; onOpenEvolution: (speciesId: number) => void; speciesId: number; level: number | null; stepsRemaining: number | null }) {
  const { t } = useTranslation()
  const [target, setTarget] = useState<{ service: DaycareService; speciesId: number; level: number | null } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void service.evolutionLevel(speciesId, controller.signal).then(level => {
      if (!controller.signal.aborted) setTarget({ service, speciesId, level })
    }).catch(() => { /* Do not invent a level when evolution data is unavailable. */ })
    return () => controller.abort()
  }, [speciesId, service])
  if (level == null || target?.speciesId !== speciesId || target.service !== service || target.level == null) return null
  const remaining = Math.max(0, target.level - level)
  const alert = daycareEvolutionAlert(level, target.level, stepsRemaining)
  const label = t(remaining ? 'daycare.evolutionRemaining' : 'daycare.evolutionReached', { count: remaining, level: target.level })
  return <>
    <button className={`daycare-evolution${alert ? ' daycare-evolution-highlight' : ''}`} onClick={() => onOpenEvolution(speciesId)} aria-label={`${label}. ${t('daycare.evolutionHint')}`} title={`${label}. ${t('daycare.evolutionHint')}`}>
    <span aria-hidden="true">↗</span><strong>{remaining}</strong>
    </button>
    {alert && <p role="status" className={`daycare-evolution-alert daycare-evolution-alert-${alert}`}>
      <span aria-hidden="true">{alert === 'soon' ? '↗' : '✓'}</span> {t(`daycare.evolutionAlert.${alert}`, { level: target.level, steps: stepsRemaining })}
    </p>}
  </>
}
