import { useEffect, useState } from 'react'
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
  const wikiLink = <a className="catalog-wiki" href={pokemonWikiUrl(entry.name)} target="_blank" rel="noopener noreferrer" aria-label={`Buscar ${pokemonDisplayName(entry.name)} en WikiDex (nueva pestaña)`} title="Consultar en WikiDex"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg></a>
  const status = collected ? readOnly ? '✓ En equipo/cajas' : '✓ En colección' : caught ? '✓ Capturado alguna vez' : caught === null ? '— Pokédex sin datos' : '○ No capturado'
  if (!pokemon) return <article className={`pokemon-card loading-card ${captured ? 'captured' : ''}`}>
    {wikiLink}
    <span className="dex-number">#{entry.id}</span><h3>{pokemonDisplayName(entry.name)}</h3>
    {(readOnly || collected) && <p className="catalog-capture-state">{status}</p>}
    {error ? <><p>No se pudo cargar.</p><button onClick={() => { setError(false); setAttempt(a => a + 1) }}>Reintentar</button></> : <p role="status">Cargando…</p>}
  </article>
  return <PokemonCard pokemon={{ ...pokemon, name: pokemonDisplayName(entry.name) }} captured={captured} showGender showMoves>
    {wikiLink}
    <AcquisitionIcons tags={acquisition?.tags} error={acquisition?.error} onRetry={onRetryAcquisition} />
    {readOnly ? <p className="catalog-capture-state" role="status">{status}</p> : <button className="primary" disabled={collected} onClick={() => onAdd(pokemon)}>{collected ? '✓ En colección' : '+ Colección'}</button>}
  </PokemonCard>
}

export function Catalog({ collection, onAdd, readOnly = false, pokedex = null }: { collection: Pokemon[]; onAdd: (pokemon: Pokemon) => void; readOnly?: boolean; pokedex?: PokedexState | null }) {
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
      if (!controller.signal.aborted) setError('No se pudo cargar el catálogo. Comprueba tu conexión.')
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
    <div className="section-heading"><div><span className="eyebrow">01 / EXPLORA</span><h2 id="catalog-title">Encuentra tus Pokémon</h2></div><span className="count">{filtered.length} especies</span></div>
    <div className="search-row">
      <label className="search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Buscar Pokémon por nombre" placeholder="Buscar por nombre, ej. oshawott" value={query} onChange={e => { setQuery(e.target.value); setPage(0) }} /></label>
      <select aria-label="Catálogo de Pokémon" value={scope} onChange={e => { setScope(e.target.value); setPage(0) }}><option value="unova">Teselia · Gen V</option><option value="all">Todas · Gen I–V</option></select>
    </div>
    <p className="hint">{readOnly ? 'Verde: Pokémon en tu equipo/cajas o capturados alguna vez según la Pokédex, aunque los hayas evolucionado o liberado. Cambia a Manual para gestionar tu colección manual.' : 'Verde: Pokémon de tu colección manual. Añade los que tienes disponibles en tu partida. Una entrada por especie.'}</p>
    <p className="hint">Las imágenes se revelan al ver o capturar una especie{readOnly ? ' según tu Pokédex' : ' al añadirla a tu colección manual'}. Pasa el cursor, toca o enfoca los iconos para consultar sus formas de obtención en Black. Pueden existir varias vías; ❔ indica información sin confirmar.</p>
    {error ? <div role="alert" className="empty">{error} <button onClick={() => { setError(''); setAttempt(a => a + 1) }}>Reintentar</button></div> : catalog.length === 0 ? <p className="empty" role="status">Cargando catálogo de PokéAPI…</p> : filtered.length === 0 ? <p className="empty">No hay coincidencias. Prueba otro nombre o el catálogo de todas las generaciones.</p> : <>
      <div className="pokemon-grid">{filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(entry => <CatalogCard key={entry.id} entry={entry} collected={collection.some(p => p.id === entry.id)} caught={readOnly && pokedex ? pokedex.caughtSpeciesIds.has(entry.id) : null} onAdd={onAdd} readOnly={readOnly} acquisition={acquisition[entry.id]} onRetryAcquisition={() => setAcquisitionAttempt(value => value + 1)} />)}</div>
      <nav className="pagination" aria-label="Páginas del catálogo"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</button><span>{page + 1} / {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Siguiente →</button></nav>
    </>}
  </section>
}
