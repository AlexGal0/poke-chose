import type { BlackEncounterDetail } from '../models/encounters'
import { encounterChances } from '../domain/encounter-chances'
import { encounterMethod } from '../domain/encounter-methods'

export function EncounterChances({ details }: { details: BlackEncounterDetail[] }) {
  const chances = encounterChances(details)
  if (!chances.length) return null
  const describe = (group: (typeof chances)[number]) => `${encounterMethod(group.method).label}: ${group.chance}% · ${group.area}${group.conditions.length ? ` · ${group.conditions.join(', ')}` : ''}`
  const summary = chances.map(describe).join('; ')
  return <div className="encounter-chances" aria-label={`Porcentajes de aparición: ${summary}`}>
    <span className="encounter-chances-label">Aparición</span>
    <div className="encounter-chances-values" title={`Según método y condiciones: ${summary}. Consulta los detalles en Encuentros en Black.`}>
      {chances.map(group => <span className="encounter-chance" key={group.key} title={describe(group)} aria-label={describe(group)}>
        <span className="encounter-chance-bar" aria-hidden="true"><span style={{ width: `${group.chance}%` }} /></span>
        <span>{encounterMethod(group.method).label}: {group.chance}%</span>
      </span>)}
    </div>
  </div>
}
