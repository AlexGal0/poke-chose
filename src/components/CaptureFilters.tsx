import { useTranslation } from 'react-i18next'
import type { CaptureFilter } from '../domain/capture-browser'
import { methodLabel } from '../i18n/encounter-methods'
import './CaptureFilters.css'

export function CaptureFilters({ methods, method, onMethodChange, progress, onProgressChange, pokedexAvailable }: {
  methods: readonly string[]; method: string; onMethodChange: (method: string) => void
  progress: CaptureFilter; onProgressChange: (progress: CaptureFilter) => void; pokedexAvailable: boolean
}) {
  const { t } = useTranslation()
  return <div className="capture-filters">
    <label>{t('encounterAtlas.method')}<select aria-label={t('encounterAtlas.method')} value={method} onChange={event => onMethodChange(event.target.value)}><option value="all">{t('encounterAtlas.allMethods')}</option>{methods.map(value => <option value={value} key={value}>{methodLabel(t, value)}</option>)}</select></label>
    {pokedexAvailable && <label>{t('encounterAtlas.progressFilter')}<select aria-label={t('encounterAtlas.progressFilter')} value={progress} onChange={event => onProgressChange(event.target.value as CaptureFilter)}>{(['all', 'pending', 'caught', 'seen'] as const).map(value => <option key={value} value={value}>{t(`encounterAtlas.progressFilters.${value}`)}</option>)}</select></label>}
  </div>
}
