import { BoxNavigation } from '../../components/BoxNavigation'
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
    <div className="collection-browser-toolbar">
    <BoxNavigation location={location} onChange={setLocation} boxCounts={browser.boxCounts} partyCount={browser.partyCount} total={collection.length} />
    <FieldMoveFilter moves={fieldMoveService.moves} selected={fieldMoves.selected} onChange={fieldMoves.setSelected} loading={fieldMoves.loading} error={fieldMoves.error} onRetry={fieldMoves.retry} />
    </div>
    {!rows.length ? (!fieldMoves.loading && !fieldMoves.error && <p className="empty">{t(browser.empty === 'collection' ? 'saveCollection.emptyCollection' : browser.empty === 'party' ? 'saveCollection.emptyParty' : browser.empty === 'box' ? 'saveCollection.emptyBox' : 'saveCollection.noMatches')}</p>) : <div className="pokemon-grid">{browser.visibleRows.map(pokemon => <SavedRosterCard key={pokemon.instanceKey} pokemon={pokemon} service={service} />)}</div>}
    {pages > 1 && <nav className="pagination" aria-label={t('saveCollection.paginationAriaLabel')}><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t('common.previousPage')}</button><span>{currentPage + 1} / {pages}</span><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>{t('common.nextPage')}</button></nav>}
  </>
}
