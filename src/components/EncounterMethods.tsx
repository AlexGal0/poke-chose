import { useTranslation } from 'react-i18next'
import type { BlackEncounterDetail } from '../models/encounters'
import { encounterMethods } from '../domain/encounter-methods'
import { methodDescription, methodLabel } from '../i18n/encounter-methods.ts'

export function EncounterMethods({ details }: { details: BlackEncounterDetail[] }) {
  const { t } = useTranslation()
  return <div className="encounter-methods" role="group" aria-label={t('encounterMethods.groupAria')}>
    {encounterMethods(details).map(({ method, icon }) =>
      <span className="encounter-method-tag" data-method={method} key={method} title={methodDescription(t, method)}>
        <span aria-hidden="true">{icon}</span><span>{methodLabel(t, method)}</span>
      </span>,
    )}
  </div>
}
