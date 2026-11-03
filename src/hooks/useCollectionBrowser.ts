import { useState } from 'react'
import { collectionBrowserView, matchesCollectionLocation } from '../domain/collection-search'
import type { BrowsablePokemon, CollectionLocationFilter } from '../domain/collection-search'
import type { FieldMoveService } from '../domain/field-moves'
import { useFieldMoveFilter } from './useFieldMoveFilter'

export function useCollectionBrowser<P extends BrowsablePokemon>(collection: readonly P[], boxCount: number, service: FieldMoveService, typeLabel: (type: string) => string) {
  const [generation, updateGeneration] = useState<number | null>(null)
  const [query, updateQuery] = useState('')
  const [location, updateLocation] = useState<CollectionLocationFilter>('all')
  const [page, setPage] = useState(0)
  const locationRows = collection.filter(pokemon => matchesCollectionLocation(pokemon, location))
  const fieldMoves = useFieldMoveFilter(locationRows, service)
  return { ...collectionBrowserView(collection, { generation, query, location, page, boxCount, typeLabel, accepts: fieldMoves.matches }), query, location, generation, setPage,
    setGeneration: (next: number | null) => { updateGeneration(next); setPage(0) },
    setQuery: (next: string) => { updateQuery(next); setPage(0) },
    setLocation: (next: CollectionLocationFilter) => { updateLocation(next); setPage(0) },
    fieldMoves: { ...fieldMoves, setSelected: (next: Parameters<typeof fieldMoves.setSelected>[0]) => { fieldMoves.setSelected(next); setPage(0) } },
  }
}
