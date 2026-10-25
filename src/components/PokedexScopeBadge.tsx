import { useTranslation } from 'react-i18next'
import { blackWhitePokedexScope } from '../domain/pokedex-scope'
import './PokedexScopeBadge.css'

export function PokedexScopeBadge({ speciesId }: { speciesId: number }) {
  const { t } = useTranslation()
  const scope = blackWhitePokedexScope(speciesId)
  if (!scope) return null
  const label = `${t(`pokedexScope.${scope}.label`)}: ${t(`pokedexScope.${scope}.description`)}`
  return <span className={`pokedex-scope-badge pokedex-scope-${scope}`} role="img" aria-label={label} title={label} tabIndex={0}>
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {scope === 'unova' ? <><path d="M5 3h14v9c0 5-7 9-7 9s-7-4-7-9Z" /><path d="M8 8v5a4 4 0 0 0 8 0V8" /></> : <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 7h14M5 17h14" /></>}
    </svg>
  </span>
}
