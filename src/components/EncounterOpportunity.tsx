import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getBlackEncounterIndex } from '../api/encounter-opportunities'
import { encounterOpportunity } from '../domain/encounter-opportunities'
import type { ZoneEncounters } from '../domain/encounter-opportunities'
import type { BlackEncounterDetail } from '../models/encounters'
import { zoneStage } from '../domain/black-zones'
import { stageLabel, zoneLabel } from '../i18n/zones.ts'
import { methodLabel } from '../i18n/encounter-methods.ts'
import './EncounterOpportunity.css'

export function EncounterOpportunity({ speciesId, locationId, details }: { speciesId: number; locationId: number; details: BlackEncounterDetail[] }) {
  const { t } = useTranslation()
  const [zones, setZones] = useState<ZoneEncounters[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    getBlackEncounterIndex().then(result => { if (active) setZones(result) }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [attempt])
  const opportunity = zones ? encounterOpportunity(speciesId, locationId, details, zones) : null
  if (opportunity?.kind === 'other') return null
  const alternatives = opportunity?.kind === 'later' ? [...new Set(opportunity.alternatives.map(row => t('encounterOpportunity.alternativeBase', { zone: zoneLabel(t, row.location), stage: stageLabel(t, zoneStage(row.location)), current: row.current, chance: row.chance, method: methodLabel(t, row.method) }) + (row.conditions.length ? t('encounterChances.describeConditionsSuffix', { conditions: row.conditions.join(', ') }) : '')))] : []
  const label = opportunity?.kind === 'unique' ? t('encounterOpportunity.uniqueLabel')
    : opportunity?.kind === 'later' ? t('encounterOpportunity.laterLabel', { alternatives: alternatives.join('; ') })
      : failed ? t('encounterOpportunity.failedLabel') : t('encounterOpportunity.pendingLabel')
  return <button type="button" className={`encounter-opportunity ${opportunity?.kind ?? 'pending'}`} title={label} aria-label={label} onClick={() => { if (failed) { setFailed(false); setAttempt(value => value + 1) } }}>
    <span aria-hidden="true">{opportunity?.kind === 'unique' ? '📍' : opportunity?.kind === 'later' ? '↗' : failed ? '?' : '…'}</span>
    <span className="opportunity-tooltip" role="tooltip">{label}</span>
  </button>
}
