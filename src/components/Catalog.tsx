import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getCatalog, getPokemon } from '../api/pokeapi'
import type { CatalogEntry, Pokemon } from '../models/pokemon'
import type { PokedexState } from '../models/pokedex'
import { PokemonCard } from './PokemonCard'
import { AcquisitionIcons } from './AcquisitionIcons'
import { getAcquisitionTags } from '../api/acquisition'
import type { AcquisitionTag } from '../domain/acquisition'
import './Catalog.css'
import { pokemonDisplayName, pokemonWikiUrl } from '../domain/pokemon-names'

const PAGE_SIZE = 12

interface AcquisitionState { tags?: AcquisitionTag[]; error?: boolean }

function CatalogCard({ entry, collected, caught, onAdd, readOnly, acquisition, onRetryAcquisition }: { entry: CatalogEntry; collected: boolean; caught: boolean | null; onAdd: (pokemon: Pokemon) => void; readOnly: boolean; acquisition?: AcquisitionState; onRetryAcquisition: () => void }) {
  const { t } = useTranslation()
  const [pokemon, setPokemon] = useState<Pokemon | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getPokemon(entry.id, controller.signal).then(setPokemon).catch(() => {
      if (!controller.signal.aborted) setError(true)
    })
    return () => controller.abort()
  }, [entry.id, attempt])
  const captured = collected || caught === true
  const wikiLink = <a className="catalog-wiki" href={pokemonWikiUrl(entry.name)} target="_blank" rel="noopener noreferrer" aria-label={t('common.wikiSearchAria', { name: pokemonDisplayName(entry.name) })} title={t('common.wikiTitle')}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg></a>
  const status = collected ? readOnly ? t('catalog.card.status.inTeamOrBoxes') : t('catalog.card.status.inCollection') : caught ? t('catalog.card.status.everCaught') : caught === null ? t('catalog.card.status.noPokedexData') : t('catalog.card.status.notCaught')
  if (!pokemon) return <article className={`pokemon-card loading-card ${captured ? 'captured' : ''}`}>
    {wikiLink}
    <span className="dex-number">#{entry.id}</span><h3>{pokemonDisplayName(entry.name)}</h3>
    {(readOnly || collected) && <p className="catalog-capture-state">{status}</p>}
    {error ? <><p>{t('catalog.card.loadError')}</p><button onClick={() => { setError(false); setAttempt(a => a + 1) }}>{t('common.retry')}</button></> : <p role="status">{t('catalog.card.loading')}</p>}
  </article>
  return <PokemonCard pokemon={{ ...pokemon, name: pokemonDisplayName(entry.name) }} captured={captured} showGender showMoves tools={wikiLink}>
    <AcquisitionIcons tags={acquisition?.tags} error={acquisition?.error} onRetry={onRetryAcquisition} />
    {readOnly ? <p className="catalog-capture-state" role="status">{status}</p> : <button className="primary" disabled={collected} onClick={() => onAdd(pokemon)}>{collected ? t('catalog.card.status.inCollection') : t('catalog.card.addButton')}</button>}
  </PokemonCard>
}

export function Catalog({ collection, onAdd, readOnly = false, pokedex = null }: { collection: Pokemon[]; onAdd: (pokemon: Pokemon) => void; readOnly?: boolean; pokedex?: PokedexState | null }) {
  const { t } = useTranslation()
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('unova')
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [acquisition, setAcquisition] = useState<Record<number, AcquisitionState>>({})
  const [acquisitionAttempt, setAcquisitionAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getCatalog(controller.signal).then(setCatalog).catch(() => {
      if (!controller.signal.aborted) setError('catalog.loadError')
    })
    return () => controller.abort()
  }, [attempt])
  const filtered = catalog.filter(p => (scope === 'all' || p.id >= 494) && (p.name.includes(query.trim().toLowerCase()) || pokemonDisplayName(p.name).toLowerCase().includes(query.trim().toLowerCase())))
  const visibleIds = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(entry => entry.id).join(',')
  useEffect(() => {
    if (!visibleIds) return
    const controller = new AbortController()
    const ids = visibleIds.split(',').map(Number)
    let next = 0
    const worker = async () => {
      while (!controller.signal.aborted && next < ids.length) {
        const id = ids[next++]
        try {
          const tags = await getAcquisitionTags(id, controller.signal)
          if (!controller.signal.aborted) setAcquisition(previous => ({ ...previous, [id]: { tags } }))
        } catch {
          if (!controller.signal.aborted) setAcquisition(previous => ({ ...previous, [id]: { error: true } }))
        }
      }
    }
    void Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker))
    return () => controller.abort()
  }, [visibleIds, acquisitionAttempt])
  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  return <section className="panel" aria-labelledby="catalog-title">
    <div className="section-heading"><div><span className="eyebrow">{t('catalog.eyebrow')}</span><h2 id="catalog-title">{t('catalog.heading')}</h2></div><span className="count">{t('common.speciesCount', { count: filtered.length })}</span></div>
    <div className="search-row">
      <label className="search"><span aria-hidden="true">⌕</span><input type="search" aria-label={t('catalog.searchAriaLabel')} placeholder={t('catalog.searchPlaceholder')} value={query} onChange={e => { setQuery(e.target.value); setPage(0) }} /></label>
      <select aria-label={t('catalog.scopeAriaLabel')} value={scope} onChange={e => { setScope(e.target.value); setPage(0) }}><option value="unova">{t('catalog.scopeUnova')}</option><option value="all">{t('catalog.scopeAll')}</option></select>
    </div>
    <p className="hint">{readOnly ? t('catalog.hintReadOnly') : t('catalog.hintManual')}</p>
    <p className="hint">{readOnly ? t('catalog.hint2ReadOnly') : t('catalog.hint2Manual')}</p>
    {error ? <div role="alert" className="empty">{t(error)} <button onClick={() => { setError(''); setAttempt(a => a + 1) }}>{t('common.retry')}</button></div> : catalog.length === 0 ? <p className="empty" role="status">{t('catalog.loadingCatalog')}</p> : filtered.length === 0 ? <p className="empty">{t('catalog.noMatches')}</p> : <>
      <div className="pokemon-grid">{filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(entry => <CatalogCard key={entry.id} entry={entry} collected={collection.some(p => p.id === entry.id)} caught={readOnly && pokedex ? pokedex.caughtSpeciesIds.has(entry.id) : null} onAdd={onAdd} readOnly={readOnly} acquisition={acquisition[entry.id]} onRetryAcquisition={() => setAcquisitionAttempt(value => value + 1)} />)}</div>
      <nav className="pagination" aria-label={t('catalog.paginationAriaLabel')}><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t('common.previousPage')}</button><span>{page + 1} / {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>{t('common.nextPage')}</button></nav>
    </>}
  </section>
}
