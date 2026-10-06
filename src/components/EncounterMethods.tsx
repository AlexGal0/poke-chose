import type { BlackEncounterDetail } from '../models/encounters'
import { encounterMethods } from '../domain/encounter-methods'

export function EncounterMethods({ details }: { details: BlackEncounterDetail[] }) {
  return <div className="encounter-methods" role="group" aria-label="Métodos de encuentro">
    {encounterMethods(details).map(({ method, label, icon, description }) =>
      <span className="encounter-method-tag" data-method={method} key={method} title={description}>
        <span aria-hidden="true">{icon}</span><span>{label}</span>
      </span>,
    )}
  </div>
}
