import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { catalogPageSize } from '../../components/catalog-pagination'
import { GenerationFilter } from '../../components/GenerationFilter'
import { BoxNavigation } from '../../components/BoxNavigation'
import { useTranslation } from 'react-i18next'
import type { SavedRosterPokemon, SavedRosterService } from './saved-roster'
import { SavedRosterCard } from './SavedRosterCard'
import { CollectionSearch } from '../../components/CollectionSearch'
import { useCollectionBrowser } from '../../hooks/useCollectionBrowser'
import { FieldMoveFilter } from '../../components/FieldMoveFilter'
import type { FieldMoveService } from '../../domain/field-moves'

export function SavedRosterCollection({ collection, service, boxCount, types, fieldMoveService, controls }: { controls?: ReactNode; types: readonly string[]; collection: SavedRosterPokemon[]; service: SavedRosterService; boxCount: number; fieldMoveService: FieldMoveService }) {
  const { t } = useTranslation()
  const browser = useCollectionBrowser(collection, boxCount, fieldMoveService, type => t(`types.${type}`))
  const { location, setLocation, query, setQuery, setPage, rows, locationRows, fieldMoves } = browser
  const [pageSize, setPageSize] = useState(12)
  const previousSize = useRef(12)
  const pages = Math.ceil(rows.length / pageSize)
  const currentPage = Math.max(0, Math.min(browser.currentPage, pages - 1))
  const gridRef = useCallback((grid: HTMLDivElement | null) => {
    if (!grid) return
    const measure = () => {
      if (!grid.getBoundingClientRect().width) return
      const size = catalogPageSize(getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length)
      if (size === previousSize.current) return
      const previous = previousSize.current
      previousSize.current = size
      setPageSize(size)
      setPage(page => Math.floor(page * previous / size))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    measure()
    return () => observer.disconnect()
  }, [setPage])
  const pagination = pages > 1 && <nav className="pagination" aria-label={t('saveCollection.paginationAriaLabel')}><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t('common.previousPage')}</button><span>{t('catalogRedesign.page', { page: currentPage + 1, pages })}</span><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>{t('common.nextPage')}</button></nav>
  return <>
    <div className="section-heading collection-heading"><h2>{t('app.tabs.collection')}</h2><span className="count">{t('saveCollection.boxFilter.filteredCount', { filtered: rows.length, total: collection.length })}</span>{controls}</div>
      <CollectionSearch showHint={false} searchAction={<GenerationFilter collection={collection} value={browser.generation} onChange={browser.setGeneration} />} collection={locationRows} types={types} query={query} onChange={setQuery} />
    <div className="collection-browser-toolbar">
    <BoxNavigation location={location} onChange={setLocation} boxCounts={browser.boxCounts} partyCount={browser.partyCount} total={collection.length} />
    <FieldMoveFilter moves={fieldMoveService.moves} selected={fieldMoves.selected} onChange={fieldMoves.setSelected} loading={fieldMoves.loading} error={fieldMoves.error} onRetry={fieldMoves.retry} />
    </div>
    {pagination}
    {!rows.length ? (!fieldMoves.loading && !fieldMoves.error && <p className="empty">{t(browser.empty === 'collection' ? 'saveCollection.emptyCollection' : browser.empty === 'party' ? 'saveCollection.emptyParty' : browser.empty === 'box' ? 'saveCollection.emptyBox' : 'saveCollection.noMatches')}</p>) : <div className="pokemon-grid" ref={gridRef}>{rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(pokemon => <SavedRosterCard key={pokemon.instanceKey} pokemon={pokemon} service={service} />)}</div>}
    {pagination}
  </>
}
