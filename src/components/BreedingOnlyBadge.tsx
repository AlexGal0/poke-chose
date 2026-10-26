import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AcquisitionContext } from '../games/core/acquisition-context'

export function BreedingOnlyBadge({ speciesId }: { speciesId: number }) {
  const service = useContext(AcquisitionContext)
  const { t } = useTranslation()
  const [result, setResult] = useState<{ id: number; service: typeof service; value: boolean } | null>(null)
  useEffect(() => {
    if (!service?.breedingOnly) return
    const controller = new AbortController()
    void service.breedingOnly(speciesId, controller.signal).then(value => {
      if (!controller.signal.aborted) setResult({ id: speciesId, service, value })
    }).catch(() => { /* Unknown acquisition must not be marked as breeding-only. */ })
    return () => controller.abort()
  }, [service, speciesId])
  return result?.id === speciesId && result.service === service && result.value ? <span className="breeding-only-badge" role="img" aria-label={t('evolutionDialog.breedingOnly')} title={t('evolutionDialog.breedingOnly')}>🥚</span> : null
}
