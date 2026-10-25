import { useTranslation } from 'react-i18next'
import type { SavedRosterPokemon, SavedRosterService } from './saved-roster'
import { SavedRosterCard } from './SavedRosterCard'
import { CollectionSearch } from '../../components/CollectionSearch'
import { useCollectionBrowser } from '../../hooks/useCollectionBrowser'
import { FieldMoveFilter } from '../../components/FieldMoveFilter'
import type { FieldMoveService } from '../../domain/field-moves'

export function SavedRosterCollection({ collection, service, boxCount, types, fieldMoveService }: { types: readonly string[]; collection: SavedRosterPokemon[]; service: SavedRosterService; boxCount: number; fieldMoveService: FieldMoveService }) {
  const { t } = useTranslation()
  const browser = useCollectionBrowser(collection, boxCount, fieldMoveService, type => t(`types.${type}`))
  const { location, setLocation, query, setQuery, setPage, rows, locationRows, pages, currentPage, fieldMoves } = browser
  return <>
    <div className="section-heading"><h2>{t('app.tabs.collection')}</h2><span className="count">{t('saveCollection.boxFilter.filteredCount', { filtered: rows.length, total: collection.length })}</span></div>
    <CollectionSearch collection={locationRows} types={types} query={query} onChange={setQuery} />
    <FieldMoveFilter moves={fieldMoveService.moves} selected={fieldMoves.selected} onChange={fieldMoves.setSelected} loading={fieldMoves.loading} error={fieldMoves.error} onRetry={fieldMoves.retry} />
    <div className="search-row">
      <select aria-label={t('saveCollection.locationLabel')} value={location} onChange={event => { const value = event.target.value; setLocation(value === 'all' || value === 'party' ? value : Number(value)) }}>
        <option value="all">{t('saveCollection.locationAll', { count: collection.length })}</option><option value="party">{t('saveCollection.locationParty', { count: collection.filter(p => p.location === 'party').length })}</option>
        {browser.boxCounts.map((count, box) => <option key={box} value={String(box)}>{t('saveCollection.locationBox', { number: box + 1, count })}</option>)}
      </select></div>
    {!rows.length ? (!fieldMoves.loading && !fieldMoves.error && <p className="empty">{t(browser.empty === 'collection' ? 'saveCollection.emptyCollection' : browser.empty === 'party' ? 'saveCollection.emptyParty' : browser.empty === 'box' ? 'saveCollection.emptyBox' : 'saveCollection.noMatches')}</p>) : <div className="pokemon-grid">{browser.visibleRows.map(pokemon => <SavedRosterCard key={pokemon.instanceKey} pokemon={pokemon} service={service} />)}</div>}
    {pages > 1 && <nav className="pagination" aria-label={t('saveCollection.paginationAriaLabel')}><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t('common.previousPage')}</button><span>{currentPage + 1} / {pages}</span><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>{t('common.nextPage')}</button></nav>}
  </>
}
