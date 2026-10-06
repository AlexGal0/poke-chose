import { useEffect, useState } from 'react'
import { getBlackEncounterIndex } from '../api/encounter-opportunities'
import { encounterOpportunity } from '../domain/encounter-opportunities'
import type { ZoneEncounters } from '../domain/encounter-opportunities'
import type { BlackEncounterDetail } from '../models/encounters'
import { zoneLabel, zoneStage } from '../domain/black-zones'
import { encounterMethod } from '../domain/encounter-methods'
import './EncounterOpportunity.css'

export function EncounterOpportunity({ speciesId, locationId, details }: { speciesId: number; locationId: number; details: BlackEncounterDetail[] }) {
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
  const alternatives = opportunity?.kind === 'later' ? [...new Set(opportunity.alternatives.map(row => `${zoneLabel(row.location)} (${zoneStage(row.location)}): ${row.current}% → ${row.chance}% · ${encounterMethod(row.method).label}${row.conditions.length ? ` · ${row.conditions.join(', ')}` : ''}`))] : []
  const label = opportunity?.kind === 'unique' ? 'Única zona con encuentros naturales registrados para esta especie en Black. No incluye regalos, evolución ni intercambios.'
    : opportunity?.kind === 'later' ? `Mayor probabilidad en zonas posteriores del orden orientativo, con el mismo método y condiciones: ${alternatives.join('; ')}. Porcentajes de tablas individuales; no se suman. Los filtros actuales de Surf y Supercaña se aplican al método comparado.`
      : failed ? 'No se pudieron comparar todas las zonas. Pulsa para reintentar.' : 'Consultando encuentros en las demás zonas de Black…'
  return <button type="button" className={`encounter-opportunity ${opportunity?.kind ?? 'pending'}`} title={label} aria-label={label} onClick={() => { if (failed) { setFailed(false); setAttempt(value => value + 1) } }}>
    <span aria-hidden="true">{opportunity?.kind === 'unique' ? '📍' : opportunity?.kind === 'later' ? '↗' : failed ? '?' : '…'}</span>
    <span className="opportunity-tooltip" role="tooltip">{label}</span>
  </button>
}
