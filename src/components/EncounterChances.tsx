import type { BlackEncounterDetail } from '../models/encounters'
import { encounterChances } from '../domain/encounter-chances'
import { encounterMethod } from '../domain/encounter-methods'
import { encounterConditionLabel, encounterSeasons } from '../domain/encounter-seasons'
import './EncounterChances.css'

export function EncounterChances({ details }: { details: BlackEncounterDetail[] }) {
  const chances = encounterChances(details)
  if (!chances.length) return null
  const seasonal = chances.some(group => encounterSeasons(group.conditions).length > 0)
  const describe = (group: (typeof chances)[number]) => `${encounterMethod(group.method).label}: ${group.chance}% · ${group.area}${group.conditions.length ? ` · ${group.conditions.map(encounterConditionLabel).join(', ')}` : ''}`
  const summary = chances.map(describe).join('; ')
  return <div className="encounter-chances" aria-label={`Porcentajes de aparición: ${summary}`}>
    <span className="encounter-chances-label">Aparición{seasonal && <span className="encounter-season-summary" title="Estos encuentros dependen de la estación. Consulta la estación indicada junto a cada porcentaje."><span aria-hidden="true">📅</span> Según estación</span>}</span>
    <div className="encounter-chances-values" title={`Según método y condiciones: ${summary}. Consulta los detalles en Encuentros en Black.`}>
      {chances.map(group => <span className="encounter-chance" key={group.key} title={describe(group)} aria-label={describe(group)}>
        <span className="encounter-chance-bar" aria-hidden="true"><span style={{ width: `${group.chance}%` }} /></span>
        <span>{encounterMethod(group.method).label}: {group.chance}%</span>
        {encounterSeasons(group.conditions).map(season => <span className="encounter-season" key={season.condition}><span aria-hidden="true">{season.icon}</span> {season.label}</span>)}
      </span>)}
    </div>
  </div>
}
