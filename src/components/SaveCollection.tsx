import { useState } from 'react'
import type { TeamSourceState } from '../sources/team'
import { PokemonCard } from './PokemonCard'
import { CollectionSearch } from './CollectionSearch'
import { matchesCollectionLocation, matchesCollectionTags } from '../domain/collection-search'
import type { CollectionLocationFilter } from '../domain/collection-search'
import { refreshLiveBoxes } from '../sources/live'
import './SaveCollection.css'

const PAGE_SIZE = 12

export function SaveCollection({ state, live = false }: { state: TeamSourceState; live?: boolean }) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState<CollectionLocationFilter>('all')
  const [page, setPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')
  const [refreshError, setRefreshError] = useState(false)
  async function refreshCollection() {
    setRefreshing(true)
    setRefreshMessage('')
    setRefreshError(false)
    try {
      await refreshLiveBoxes()
      setRefreshMessage('Lectura de cajas completada.')
    } catch (cause) {
      setRefreshError(true)
      setRefreshMessage(cause instanceof Error ? cause.message : 'No se pudo actualizar la colección.')
    } finally { setRefreshing(false) }
  }
  const collection = state.collection
  const locationCollection = collection?.filter(pokemon => matchesCollectionLocation(pokemon, location)) ?? []
  const filtered = locationCollection.filter(pokemon => matchesCollectionTags(pokemon, query))
  const boxCounts = Array.from({ length: 24 }, (_, box) => collection?.filter(pokemon => matchesCollectionLocation(pokemon, box)).length ?? 0)
  const partyCount = collection?.filter(pokemon => pokemon.location === 'party').length ?? 0
  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(0, pages - 1))
  return <section className="panel collection-panel" aria-labelledby="collection-title">
    <div className="section-heading"><div><span className="eyebrow">03 / EQUIPO + CAJAS</span><h2 id="collection-title">Mi colección</h2></div>{collection !== null && <span className="count">{collection.length} ejemplares</span>}</div>
    <p className="hint">Pokémon del equipo y las cajas. Los duplicados se muestran por separado. {live ? 'Las cajas se actualizan cada 2 minutos o al pulsar Actualizar colección. Los cambios del PC pueden tardar en aparecer; la lectura puede durar varios segundos.' : 'Se actualiza al guardar en el juego.'} Esta vista es de solo lectura.</p>
    {live && <div className="collection-refresh"><button className="primary" disabled={refreshing || !state.connected} onClick={() => { void refreshCollection() }}>{refreshing ? 'Actualizando cajas…' : 'Actualizar colección'}</button>{!state.connected && <span className="hint">Conecta el lector en vivo para actualizar.</span>}</div>}
    {live && refreshMessage && <p className={refreshError ? 'notice' : 'hint'} role={refreshError ? 'alert' : 'status'}>{refreshMessage}</p>}
    {state.collectionLoading && <p className="hint" role="status">Sincronizando colección y datos de especies…</p>}
    {state.collectionError && <p className="notice" role="alert">No se pudo resolver la colección con PokéAPI. Reintentando automáticamente; se conserva la última colección válida.</p>}
    {(state.error || !state.connected) && collection !== null && <p className="notice">Mostrando la última colección válida. Comprueba el estado de melonDS.</p>}
    {collection === null ? <p className="empty">Esperando una colección válida de la partida…</p> : <>
      <div className="collection-box-filter">
        <label htmlFor="collection-box">Ubicación</label>
        <select id="collection-box" value={location} onChange={event => {
          const value = event.target.value
          setLocation(value === 'all' || value === 'party' ? value : Number(value))
          setPage(0)
        }}>
          <option value="all">Equipo y todas las cajas ({collection.length})</option>
          <option value="party">Equipo ({partyCount})</option>
          {boxCounts.map((count, box) => <option key={box} value={box}>Caja {box + 1} ({count})</option>)}
        </select>
        <span className="hint" role="status">{filtered.length} / {collection.length} ejemplares</span>
      </div>
      <CollectionSearch collection={locationCollection} query={query} onChange={next => { setQuery(next); setPage(0) }} />
      {collection.length === 0 ? <p className="empty">No hay Pokémon en el equipo ni en las cajas.</p> : !locationCollection.length ? <p className="empty">{location === 'party' ? 'No hay Pokémon en el equipo.' : 'Esta caja está vacía.'}</p> : !filtered.length ? <p className="empty">Sin coincidencias con los filtros actuales.</p> : <>
        <div className="pokemon-grid">{filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(pokemon => <PokemonCard key={pokemon.instanceKey} pokemon={pokemon} selected={pokemon.location === 'party'} fainted={pokemon.location === 'party' && state.team.some(member => member.personality === pokemon.personality && member.trainerId === pokemon.trainerId && !member.isEgg && member.currentHp === 0 && (member.maxHp ?? 0) > 0)} showMoves>
          <div className="save-member-info">{pokemon.location === 'party' ? `Equipo · Espacio ${pokemon.slot + 1}` : `Caja ${pokemon.box! + 1} · Posición ${pokemon.slot + 1}`}{pokemon.isEgg ? <small>Huevo</small> : pokemon.level !== null && <small>Nv. {pokemon.level}</small>}</div>
        </PokemonCard>)}</div>
        {pages > 1 && <nav className="pagination" aria-label="Páginas de colección sincronizada"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Anterior</button><span>{currentPage + 1} / {pages}</span><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Siguiente →</button></nav>}
      </>}
    </>}
  </section>
}
