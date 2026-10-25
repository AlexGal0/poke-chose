import { useTranslation } from 'react-i18next'

export type SourceMode = 'manual' | 'save' | 'live'
export function SourceModeSelect({ source, onChange, live = true, emulator = 'melonDS' }: { source: SourceMode; onChange: (source: SourceMode) => void; live?: boolean; emulator?: string }) {
  const { t } = useTranslation()
  return <label>{t('saveSync.sourceLabel')} <select aria-label={t('saveSync.sourceLabel')} value={source} onChange={event => onChange(event.target.value as SourceMode)}>
    <option value="manual">{t('saveSync.sourceManual')}</option><option value="save">{t('saveSync.sourceSaveFor', { emulator })}</option><option value="live" disabled={!live}>{t('saveSync.sourceLiveFor', { emulator })}</option>
  </select></label>
}
