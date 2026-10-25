import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Daycare } from '../../components/Daycare'
import { EvolutionContext } from '../../components/evolution-context'
import { blackDaycareReading, blackDaycareService } from './daycare'
import type { TeamSourceState } from '../../sources/team'

export function BlackDaycare({ state, source }: { state: TeamSourceState; source: 'manual' | 'save' | 'live' }) {
  const { t } = useTranslation()
  const openEvolution = useContext(EvolutionContext)
  return <Daycare reading={blackDaycareReading(state.daycare, state.daycareStale, source !== 'manual')}
    service={blackDaycareService} onOpenEvolution={openEvolution}
    hint={t(source === 'manual' ? 'daycare.manual' : source === 'save' ? 'daycare.saveHint' : 'daycare.liveHint')} />
}
