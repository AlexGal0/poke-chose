import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isCounterpartExclusive } from '../games/core/acquisition'
import type { AcquisitionAvailability, AcquisitionService } from '../games/core/acquisition'
import { acquisitionText } from '../i18n/acquisition-text'
import './ExclusiveBadge.css'

export function ExclusiveBadge({ service, speciesId }: { service?: AcquisitionService; speciesId: number }) {
  const { t } = useTranslation()
  const [result, setResult] = useState<{ service: AcquisitionService; speciesId: number; value: AcquisitionAvailability }>()
  useEffect(() => {
    if (!service?.availability) return
    const controller = new AbortController()
    service.availability(speciesId, controller.signal).then(value => {
      if (!controller.signal.aborted) setResult({ service, speciesId, value })
    }).catch(() => { /* Unverified availability never displays an exclusive badge. */ })
    return () => controller.abort()
  }, [service, speciesId])
  const availability = result?.service === service && result?.speciesId === speciesId ? result.value : undefined
  if (!service || !availability || !isCounterpartExclusive(availability) || !availability.counterpart) return null
  const game = service.gameName
  const counterpart = acquisitionText(t, availability.counterpart.gameName)
  const explanation = t('acquisitionAvailability.exclusiveHint', { game, counterpart })
  return <span className="exclusive-badge" tabIndex={0} title={explanation} aria-label={explanation} data-exclusive={service.id}>{t('acquisitionAvailability.exclusive', { game })}</span>
}
