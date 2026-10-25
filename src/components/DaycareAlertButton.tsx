import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { daycareAlerts } from '../domain/daycare-alerts'
import type { DaycareEvolutionData } from '../domain/daycare-alerts'
import type { DaycareReading, DaycareService } from '../games/core/daycare'
import './DaycareAlertButton.css'

export function DaycareAlertButton({ reading, service, onClick }: { reading: DaycareReading; service: DaycareService; onClick: () => void }) {
  const { t } = useTranslation()
  const daycare = reading.available ? reading.data : null
  const speciesKey = [...new Set(daycare?.slots.flatMap(member => member ? [member.speciesId] : []) ?? [])].sort((a, b) => a - b).join(',')
  const [data, setData] = useState<{ service: DaycareService; key: string; species: Map<number, DaycareEvolutionData> } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const ids = speciesKey ? speciesKey.split(',').map(Number) : []
    void Promise.allSettled(ids.map(async id => {
      const [levels, root] = await Promise.all([
        service.experienceLevels(id, controller.signal),
        service.evolutionLevel(id, controller.signal),
      ])
      return [id, { levels, target: root }] as const
    })).then(results => {
      if (!controller.signal.aborted) setData({ service, key: speciesKey, species: new Map(results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])) })
    })
    return () => controller.abort()
  }, [speciesKey, service])
  const { egg, evolutions: alerts } = daycareAlerts(reading, data?.key === speciesKey && data.service === service ? data.species : new Map())
  if (!egg && !alerts.length) return null
  const evolutionLabel = alerts.length ? `${t('daycare.floatingAlert', { count: alerts.length })}. ${alerts.map(({ slot, alert }) => t(`daycare.floatingDetail.${alert}`, { slot })).join('. ')}` : ''
  const label = [egg ? t('daycare.floatingEgg') : '', evolutionLabel].filter(Boolean).join('. ')
  return <button className={`daycare-floating-alert${egg ? ' daycare-floating-alert-egg' : alerts.some(item => item.alert === 'soon') ? ' daycare-floating-alert-soon' : ''}`} onClick={onClick} title={label} aria-label={label} aria-live="polite" aria-atomic="true">
    <span aria-hidden="true">{egg ? '🥚' : '↗'}</span>{alerts.length > 0 && <strong aria-hidden="true">{alerts.length}</strong>}
  </button>
}
