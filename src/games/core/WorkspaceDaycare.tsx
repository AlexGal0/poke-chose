import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Daycare } from '../../components/Daycare'
import { KnowledgeContext } from './knowledge-context'
import type { DaycareReading, DaycareService } from './daycare'

export function WorkspaceDaycare({ reading, service, hint }: { reading: DaycareReading; service: DaycareService; hint: string }) {
  const context = useContext(KnowledgeContext)
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  async function openEvolution(speciesId: number) {
    setFailed(false)
    try {
      const pokemon = await service.resolve(speciesId, 0)
      context?.open({ ...pokemon, id: speciesId, types: [] }, 'evolution')
    } catch { setFailed(true) }
  }
  return <>{failed && <p role="alert">{t('daycare.evolutionLoadError')}</p>}<Daycare reading={reading} service={service} hint={hint} onOpenEvolution={speciesId => { void openEvolution(speciesId) }} /></>
}
