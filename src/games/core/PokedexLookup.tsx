import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PokedexState } from '../../models/pokedex'
import type { SpeciesEntry } from './catalog'
import { pokemonDisplayName } from '../../domain/pokemon-names'
import { normalizeTag } from '../../domain/collection-search'

export function PokedexLookup({ pokedex, species }: { pokedex: PokedexState; species: readonly SpeciesEntry[] }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const normalized = normalizeTag(query.trim())
  const matches = normalized ? species.filter(p => normalizeTag(p.name).includes(normalized) || String(p.id) === normalized).slice(0, 8) : []
  return <details className="dex-lookup"><summary>{t('captureChecklist.pokedexLookup.summary', { caught: pokedex.caughtSpeciesIds.size, seen: pokedex.seenSpeciesIds.size })}</summary>
    <p className="hint">{t('encounterAtlas.dexLookupHint')}</p>
    <input type="search" aria-label={t('captureChecklist.pokedexLookup.inputAriaLabel')} placeholder={t('captureChecklist.pokedexLookup.placeholder')} value={query} onChange={event => setQuery(event.target.value)} />
    <ul>{matches.map(p => <li key={p.id}><strong>{pokemonDisplayName(p.name)}</strong> · {t(pokedex.caughtSpeciesIds.has(p.id) ? 'captureChecklist.status.caught' : 'captureChecklist.status.notCaught')} <small>({t(pokedex.seenSpeciesIds.has(p.id) ? 'captureChecklist.pokedexLookup.seenLabel' : 'captureChecklist.pokedexLookup.notSeenLabel')})</small></li>)}</ul>
    {normalized && matches.length === 0 && <p className="hint">{t('captureChecklist.pokedexLookup.noMatches')}</p>}
  </details>
}
