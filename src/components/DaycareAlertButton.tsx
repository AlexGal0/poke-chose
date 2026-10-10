import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getExperienceLevels } from '../api/experience'
import type { ExperienceLevel } from '../api/experience'
import { getEvolutionFamily, getEvolutionSpecies } from '../api/evolution'
import { daycareEvolutionAlert, nextEvolutionLevel } from '../domain/daycare-evolution'
import { experienceProgress, levelFromExperience } from '../domain/experience'
import type { DaycareState } from '../models/party'
import './DaycareAlertButton.css'

interface EvolutionData { levels: ExperienceLevel[]; target: number | null }

export function DaycareAlertButton({ daycare, stale, onClick }: { daycare: DaycareState | null; stale: boolean; onClick: () => void }) {
  const { t } = useTranslation()
  const speciesKey = [...new Set(daycare?.slots.flatMap(member => member ? [member.speciesId] : []) ?? [])].sort((a, b) => a - b).join(',')
  const [data, setData] = useState<{ key: string; species: Map<number, EvolutionData> } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const ids = speciesKey ? speciesKey.split(',').map(Number) : []
    void Promise.allSettled(ids.map(async id => {
      const [levels, root] = await Promise.all([
        getExperienceLevels(id, controller.signal),
        getEvolutionSpecies(id, controller.signal).then(species => getEvolutionFamily(species, controller.signal)),
      ])
      return [id, { levels, target: nextEvolutionLevel(root, id) }] as const
    })).then(results => {
      if (!controller.signal.aborted) setData({ key: speciesKey, species: new Map(results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])) })
    })
    return () => controller.abort()
  }, [speciesKey])
  if (!daycare || stale || data?.key !== speciesKey) return null
  const alerts = daycare.slots.flatMap((member, index) => {
    const info = member && data.species.get(member.speciesId)
    if (!member || !info || info.target == null) return []
    const experience = member.experience + member.gainedExperience
    const level = levelFromExperience(experience, info.levels)
    if (level == null) return []
    const progress = experienceProgress(level, experience, info.levels)
    const alert = daycareEvolutionAlert(level, info.target, progress?.remaining ?? null)
    return alert ? [{ slot: index + 1, alert }] : []
  })
  if (!alerts.length) return null
  const label = `${t('daycare.floatingAlert', { count: alerts.length })}. ${alerts.map(({ slot, alert }) => t(`daycare.floatingDetail.${alert}`, { slot })).join('. ')}`
  return <button className={`daycare-floating-alert${alerts.some(item => item.alert === 'soon') ? ' daycare-floating-alert-soon' : ''}`} onClick={onClick} title={label} aria-label={label}>
    <span aria-hidden="true">↗</span><strong aria-hidden="true">{alerts.length}</strong>
  </button>
}
