export type CollectionLocationFilter = 'all' | 'party' | number

export function matchesCollectionLocation(pokemon: { location?: 'party' | 'box'; box?: number | null }, filter: CollectionLocationFilter): boolean {
  return filter === 'all' || (filter === 'party' ? pokemon.location === 'party' : pokemon.location === 'box' && pokemon.box === filter)
}

export interface BrowsablePokemon {
  id: number; name: string; nickname?: string | null; types: readonly string[]
  location?: 'party' | 'box'; box?: number | null; form?: number; isEgg?: boolean
}

export function collectionBrowserView<P extends BrowsablePokemon>(collection: readonly P[], options: {
  location: CollectionLocationFilter; query: string; page: number; boxCount: number
  typeLabel: (type: string) => string; accepts?: (pokemon: P) => boolean
}) {
  const locationRows = collection.filter(pokemon => matchesCollectionLocation(pokemon, options.location))
  const rows = locationRows.filter(pokemon => matchesCollectionTags(pokemon, options.query, options.typeLabel) && (options.accepts?.(pokemon) ?? true))
  const pages = Math.ceil(rows.length / 12)
  const currentPage = Math.max(0, Math.min(options.page, pages - 1))
  return { locationRows, rows, pages, currentPage, visibleRows: rows.slice(currentPage * 12, (currentPage + 1) * 12),
    partyCount: collection.filter(pokemon => pokemon.location === 'party').length,
    boxCounts: Array.from({ length: options.boxCount }, (_, box) => collection.filter(pokemon => matchesCollectionLocation(pokemon, box)).length),
    empty: !collection.length ? 'collection' : !locationRows.length ? options.location === 'party' ? 'party' : 'box' : !rows.length ? 'matches' : null,
  }
}

export function normalizeTag(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^#/, '')
}

export function collectionTags(query: string) {
  return query.split(/[\s,]+/).filter(Boolean)
}

export function matchesCollectionTags<T extends string>(pokemon: { id: number; name: string; nickname?: string | null; types: readonly T[] }, query: string, typeLabel: (type: T) => string) {
  const types = pokemon.types.flatMap(type => [type, normalizeTag(typeLabel(type))])
  return collectionTags(query).every(tag => {
    const normalized = normalizeTag(tag)
    return normalized !== '' && (normalizeTag(pokemon.name).includes(normalized) || normalizeTag(pokemon.nickname ?? '').includes(normalized) || String(pokemon.id) === normalized || types.includes(normalized))
  })
}
