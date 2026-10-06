import { useTranslation } from 'react-i18next'
import type { BlackEncounterDetail } from '../models/encounters'
import { encounterChances } from '../domain/encounter-chances'
import { encounterMethod } from '../domain/encounter-methods'
import { encounterConditionLabel, encounterSeasons } from '../domain/encounter-seasons'
import './EncounterChances.css'

export function EncounterChances({ details }: { details: BlackEncounterDetail[] }) {
  const { t } = useTranslation()
  const chances = encounterChances(details)
  if (!chances.length) return null
  const seasonal = chances.some(group => encounterSeasons(group.conditions).length > 0)
  const describe = (group: (typeof chances)[number]) => t('encounterChances.describeBase', { method: encounterMethod(group.method).label, chance: group.chance, area: group.area }) + (group.conditions.length ? t('encounterChances.describeConditionsSuffix', { conditions: group.conditions.map(encounterConditionLabel).join(', ') }) : '')
  const summary = chances.map(describe).join('; ')
  return <div className="encounter-chances" aria-label={t('encounterChances.ariaLabel', { summary })}>
    <span className="encounter-chances-label">{t('encounterChances.label')}{seasonal && <span className="encounter-season-summary" title={t('encounterChances.seasonalTitle')}><span aria-hidden="true">📅</span> {t('encounterChances.seasonalBadge')}</span>}</span>
    <div className="encounter-chances-values" title={t('encounterChances.valuesTitle', { summary, detailsLabel: t('captureChecklist.encountersSummary') })}>
      {chances.map(group => <span className="encounter-chance" key={group.key} title={describe(group)} aria-label={describe(group)}>
        <span className="encounter-chance-bar" aria-hidden="true"><span style={{ width: `${group.chance}%` }} /></span>
        <span>{encounterMethod(group.method).label}: {group.chance}%</span>
        {encounterSeasons(group.conditions).map(season => <span className="encounter-season" key={season.condition}><span aria-hidden="true">{season.icon}</span> {season.label}</span>)}
      </span>)}
    </div>
  </div>
}
