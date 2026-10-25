import { useTranslation } from 'react-i18next'
import { useContext } from 'react'
import { GameGenerationContext } from '../games/core/game-generation-context'
import { speciesGeneration } from '../domain/species-generation'
import './GenerationBadge.css'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

export function GenerationBadge({ speciesId }: { speciesId: number }) {
  const { t } = useTranslation()
  const generation = speciesGeneration(speciesId)
  const currentGeneration = useContext(GameGenerationContext)
  if (generation === null) return null
  const label = t('pokemonCard.originGeneration', { number: generation })
  return <span className={`generation-badge${generation === currentGeneration ? ' current-generation' : ''}`} aria-label={label} title={label}>{ROMAN[generation - 1]}</span>
}
