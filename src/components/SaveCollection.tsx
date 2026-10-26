import { BoxNavigation } from './BoxNavigation'
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
      <p className="hint" role="status">{t('saveCollection.boxFilter.filteredCount', { filtered: filtered.length, total: collection.length })}</p>
      <CollectionSearch types={types} collection={locationCollection} query={query} onChange={setQuery} />
    <div className="collection-browser-toolbar">
      <BoxNavigation location={location} onChange={setLocation} boxCounts={boxCounts} partyCount={partyCount} total={collection.length} />
      <FieldMoveFilter moves={fieldMoveService.moves} selected={fieldMoves.selected} onChange={fieldMoves.setSelected} loading={fieldMoves.loading} error={fieldMoves.error} onRetry={fieldMoves.retry} />
    </div>
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
