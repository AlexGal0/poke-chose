import { useTranslation } from 'react-i18next'
import { speciesGeneration } from '../domain/species-generation'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

export function GenerationFilter({ collection, value, onChange }: {
  collection: readonly { id: number; speciesId?: number }[]
  value: number | null
  onChange: (generation: number | null) => void
}) {
  const { t } = useTranslation()
  const generations = [...new Set(collection.map(pokemon => speciesGeneration(pokemon.speciesId ?? pokemon.id)).filter((generation): generation is number => generation !== null))]
  if (value !== null && !generations.includes(value)) generations.push(value)
  generations.sort((a, b) => a - b)
  return <label className="generation-filter">{t('collectionSearch.generationShortLabel')}{' '}
    <select aria-label={t('collectionSearch.generationLabel')} value={value ?? ''} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}>
      <option value="">{t('collectionSearch.allGenerationsShort')}</option>
      {generations.map(generation => <option key={generation} value={generation}>{ROMAN[generation - 1]}</option>)}
    </select>
  </label>
}
