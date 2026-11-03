import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EncounterAtlas } from './EncounterAtlas'
import type { EncounterAtlasData, EncounterAtlasService } from './encounters'
import type { ComponentProps } from 'react'

export function EncounterLoader({ service, ...props }: Omit<ComponentProps<typeof EncounterAtlas>, 'data'> & { service: EncounterAtlasService }) {
  const { t } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ service: EncounterAtlasService; data?: EncounterAtlasData; error?: boolean } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    service.load(controller.signal).then(data => { if (!controller.signal.aborted) setResult({ service, data }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ service, error: true }) })
    return () => controller.abort()
  }, [service, attempt])
  const current = result?.service === service ? result : null
  if (current?.data) return <EncounterAtlas {...props} data={current.data} />
  return <p role={current?.error ? 'alert' : 'status'}>{t(current?.error ? 'captureChecklist.errors.loadEncounters' : 'captureChecklist.loadingEncounters')}{current?.error && <button onClick={() => { setResult(null); setAttempt(value => value + 1) }}>{t('common.retry')}</button>}</p>
}
