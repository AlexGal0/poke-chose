import { useTranslation } from 'react-i18next'
import type { ManualPokemon } from './catalog'
import '../../components/PokedexScopeBadge.css'

export function SpeciesScopeBadge({ scope }: { scope: ManualPokemon['scope'] }) {
  const { t } = useTranslation()
  if (!scope) return null
  const label = `${t(scope.labelKey)}: ${t(scope.descriptionKey)}`
  return <span className={`pokedex-scope-badge pokedex-scope-${scope.id}`} role="img" aria-label={label} title={label} tabIndex={0}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 7h14M5 17h14" /></svg></span>
}
