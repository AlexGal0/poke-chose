import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AnalysisPokemon, TypeRules } from '../domain/type-analysis'
import { collectionAlternatives } from '../domain/team-options'
import { matchesCollectionTags } from '../domain/collection-search'
import { pokemonDisplayName } from '../domain/pokemon-names'
import { typeLabel } from '../i18n/types'
import { CollectionSearch } from './CollectionSearch'
import { TypeBadge } from './TypeBadge'
import { GenerationBadge } from './GenerationBadge'

export function AnalysisAlternatives({ rules, team, collection, discovered, includeFainted, stale }: {
  rules: TypeRules; team: readonly AnalysisPokemon[]; collection: readonly AnalysisPokemon[] | null
  discovered: ReadonlySet<number>; includeFainted: boolean; stale?: boolean
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const options = collectionAlternatives(rules, team, collection ?? [], discovered, includeFainted)
  const filtered = options.filter(row => matchesCollectionTags(row.pokemon, query, type => typeLabel(t, type)))
  return <section className="analysis-alternatives" aria-labelledby="analysis-alternatives-title">
    <h3 id="analysis-alternatives-title">{t('teamAnalysis.alternatives')}</h3>
    <p className="hint">{t('teamAnalysis.alternativesHint')}</p>
    {stale && <p className="notice" role="status">{t('teamAnalysis.collectionStale')}</p>}
    {collection === null ? <p className="empty">{t('teamAnalysis.collectionUnavailable')}</p> : <>
      <CollectionSearch collection={options.map(row => row.pokemon)} types={rules.types} query={query} onChange={setQuery} searchLabel={t('teamAnalysis.search')} />
      <p className="hint">{t('teamAnalysis.results', { count: filtered.length })}</p>
      {filtered.length ? <ul className="analysis-options">{filtered.slice(0, 6).map(({ pokemon, resists, coverage }) => <li key={pokemon.instanceKey ?? pokemon.id}>
        <GenerationBadge speciesId={pokemon.id} />
        <div className="analysis-option-heading">{pokemon.sprite && <img src={pokemon.sprite} alt="" width="48" height="48" loading="lazy" />}<div><strong>{pokemon.nickname || pokemonDisplayName(pokemon.name)}</strong>{pokemon.nickname && <small>{pokemonDisplayName(pokemon.name)}</small>}<div className="types">{pokemon.types.map(type => <TypeBadge key={type} type={type} />)}</div></div></div>
        {pokemon.location === 'box' && pokemon.box != null && pokemon.slot !== undefined && <p className="hint">{t('saveCollection.memberBoxSlot', { box: pokemon.box + 1, slot: pokemon.slot + 1 })}</p>}
        {resists.length > 0 && <p>{t('teamAnalysis.resists', { types: resists.map(type => typeLabel(t, type)).join(', ') })}</p>}
        {coverage.length > 0 && <p>{t('teamAnalysis.addsCoverage', { types: coverage.map(type => typeLabel(t, type)).join(', ') })}</p>}
      </li>)}</ul> : <p className="empty">{t(query ? 'teamAnalysis.noMatches' : 'teamAnalysis.noAlternatives')}</p>}
      {filtered.length > 6 && <p className="hint">{t('teamAnalysis.limit')}</p>}
    </>}
  </section>
}
