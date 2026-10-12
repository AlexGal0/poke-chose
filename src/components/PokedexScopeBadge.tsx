import { useTranslation } from 'react-i18next'
import { blackWhitePokedexScope } from '../domain/pokedex-scope'
import './PokedexScopeBadge.css'

export function PokedexScopeBadge({ speciesId }: { speciesId: number }) {
  const { t } = useTranslation()
  const scope = blackWhitePokedexScope(speciesId)
  if (!scope) return null
  return <span className={`pokedex-scope-badge pokedex-scope-${scope}`} title={t(`pokedexScope.${scope}.description`)}>
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="3" /><circle cx="12" cy="7" r="2" /><path d="M8 14h8M8 18h5" /></svg>
    {t(`pokedexScope.${scope}.label`)}
    <span className="sr-only">: {t(`pokedexScope.${scope}.description`)}</span>
  </span>
}
