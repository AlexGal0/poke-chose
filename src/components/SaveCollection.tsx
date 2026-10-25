import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TeamSourceState } from '../sources/team'
import { PokemonCard } from './PokemonCard'
import { CollectionDetails } from './CollectionDetails'
import { IndividualGenderIcon } from './IndividualGenderIcon'
import { CollectionSearch } from './CollectionSearch'
import { FieldMoveFilter } from './FieldMoveFilter'
import { useCollectionBrowser } from '../hooks/useCollectionBrowser'
import type { FieldMoveService } from '../domain/field-moves'
import { noticeText, toNotice } from '../i18n/notice.ts'
import type { Notice } from '../i18n/notice.ts'
import './SaveCollection.css'

export function SaveCollection({ state, live = false, boxCount, types, fieldMoveService, refresh }: {
  state: TeamSourceState; live?: boolean; boxCount: number; types: readonly string[]; fieldMoveService: FieldMoveService; refresh: () => Promise<unknown>
}) {
  const { t } = useTranslation()
  const [boxColors] = useState(() => Array.from({ length: boxCount }, () => Math.floor(Math.random() * 6)))
  const [boxTextures] = useState(() => Array.from({ length: boxCount }, () => Math.floor(Math.random() * 4)))
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState<Notice>(null)
  const [refreshError, setRefreshError] = useState(false)
  async function refreshCollection() {
    setRefreshing(true)
    setRefreshMessage(null)
    setRefreshError(false)
    try {
      await refresh()
      setRefreshMessage({ key: 'saveCollection.refresh.success' })
    } catch (cause) {
      setRefreshError(true)
      setRefreshMessage(toNotice(cause, 'saveCollection.refresh.genericError'))
    } finally { setRefreshing(false) }
  }
  const collection = state.collection
  const browser = useCollectionBrowser(collection ?? [], boxCount, fieldMoveService, type => t(`types.${type}`))
  const { query, setQuery, location, setLocation, setPage, fieldMoves, boxCounts, partyCount, pages, currentPage, locationRows: locationCollection, rows: filtered } = browser
  return <section className="panel collection-panel" aria-labelledby="collection-title">
    <div className="section-heading"><div><span className="eyebrow">{t('saveCollection.eyebrow')}</span><h2 id="collection-title">{t('app.collection.heading')}</h2></div>{collection !== null && <span className="count">{t('saveCollection.header.count', { count: collection.length })}</span>}</div>
    <p className="hint">{live ? t('saveCollection.hintLive') : t('saveCollection.hintSave')}</p>
    {live && <div className="collection-refresh"><button className="primary" disabled={refreshing || !state.connected} onClick={() => { void refreshCollection() }}>{refreshing ? t('saveCollection.refresh.updating') : t('saveCollection.refresh.button')}</button>{!state.connected && <span className="hint">{t('saveCollection.refresh.connectHint')}</span>}</div>}
    {live && refreshMessage && <p className={refreshError ? 'notice' : 'hint'} role={refreshError ? 'alert' : 'status'}>{noticeText(t, refreshMessage)}</p>}
    {state.collectionLoading && <p className="hint" role="status">{t('saveCollection.syncingNotice')}</p>}
    {state.collectionError && <p className="notice" role="alert">{t('saveCollection.resolveErrorNotice')}</p>}
    {(state.error || !state.connected) && collection !== null && <p className="notice">{t('saveCollection.staleNotice')}</p>}
    {collection === null ? <p className="empty">{t('saveCollection.waitingNotice')}</p> : <>
      <details className="collection-box-filter">
        <summary>{t('saveCollection.locationLabel')}: {location === 'all' ? t('saveCollection.locationAll', { count: collection.length }) : location === 'party' ? t('saveCollection.locationParty', { count: partyCount }) : t('saveCollection.locationBox', { number: location + 1, count: boxCounts[location] })}</summary>
        <div className="collection-box-options" role="group" aria-label={t('saveCollection.locationLabel')}>
        <div className="collection-location-shortcuts">
          <button className="collection-location-button" aria-pressed={location === 'party'} onClick={() => { setLocation('party'); setPage(0) }}>{t('saveCollection.locationParty', { count: partyCount })}</button>
          <button className="collection-all-button" aria-pressed={location === 'all'} onClick={() => { setLocation('all'); setPage(0) }}>{t('saveCollection.locationAll', { count: collection.length })}</button>
        </div>
        <div className="collection-box-grid">
          {boxCounts.map((count, box) => <button key={box} className={`collection-location-button collection-box-color-${boxColors[box]} collection-box-texture-${boxTextures[box]}`} aria-pressed={location === box} onClick={() => { setLocation(box); setPage(0) }}>{t('saveCollection.locationBox', { number: box + 1, count })}</button>)}
        </div>
        </div>
      </details>
      <p className="hint" role="status">{t('saveCollection.boxFilter.filteredCount', { filtered: filtered.length, total: collection.length })}</p>
      <CollectionSearch types={types} collection={locationCollection} query={query} onChange={setQuery} />
      <FieldMoveFilter moves={fieldMoveService.moves} selected={fieldMoves.selected} onChange={fieldMoves.setSelected} loading={fieldMoves.loading} error={fieldMoves.error} onRetry={fieldMoves.retry} />
      {collection.length === 0 ? <p className="empty">{t('saveCollection.emptyCollection')}</p> : !locationCollection.length ? <p className="empty">{location === 'party' ? t('saveCollection.emptyParty') : t('saveCollection.emptyBox')}</p> : !filtered.length ? (!fieldMoves.loading && !fieldMoves.error && <p className="empty">{t('saveCollection.noMatches')}</p>) : <>
        <div className="pokemon-grid">{browser.visibleRows.map(pokemon => <PokemonCard key={pokemon.instanceKey} pokemon={pokemon} selected={pokemon.location === 'party'} fainted={pokemon.location === 'party' && state.team.some(member => member.personality === pokemon.personality && member.trainerId === pokemon.trainerId && !member.isEgg && member.currentHp === 0 && (member.maxHp ?? 0) > 0)} showMoves showPokedexScope tools={<IndividualGenderIcon pokemon={pokemon} />}>
          <CollectionDetails pokemon={pokemon} />
          <div className="save-member-info">{pokemon.location === 'party' ? t('saveCollection.memberPartySlot', { slot: pokemon.slot + 1 }) : t('saveCollection.memberBoxSlot', { box: pokemon.box! + 1, slot: pokemon.slot + 1 })}{pokemon.isEgg && <small>{t('app.team.eggLabel')}</small>}</div>
        </PokemonCard>)}</div>
        {pages > 1 && <nav className="pagination" aria-label={t('saveCollection.paginationAriaLabel')}><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t('common.previousPage')}</button><span>{currentPage + 1} / {pages}</span><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>{t('common.nextPage')}</button></nav>}
      </>}
    </>}
  </section>
}
