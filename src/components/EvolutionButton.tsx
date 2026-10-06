import { pokemonDisplayName } from '../domain/pokemon-names'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { EvolutionContext } from './evolution-context'

export function EvolutionButton({ speciesId, name, compact = false }: { speciesId: number; name: string; compact?: boolean }) {
  const { t } = useTranslation()
  const open = useContext(EvolutionContext)
  return <button className={`evolution-button${compact ? ' evolution-button-icon' : ''}`} onClick={() => open(speciesId)} aria-label={t('evolutionButton.viewTreeAria', { name: pokemonDisplayName(name) })} title={t('evolutionButton.viewTreeTitle')}>{compact ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h7m0 0V5h5m-5 7v7h5" /><circle cx="4" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" /></svg> : t('evolutionButton.label')}</button>
}
