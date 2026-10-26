import type { CollectionLocationFilter } from './collection-search.ts'

export function adjacentBox(location: CollectionLocationFilter, direction: -1 | 1, boxCount: number): number | null {
  const next = typeof location === 'number' ? location + direction : direction === 1 ? 0 : boxCount - 1
  return next >= 0 && next < boxCount ? next : null
}

export function matchesBoxSearch(value: CollectionLocationFilter, label: string, query: string): boolean {
  const term = query.trim().toLocaleLowerCase()
  return /^\d+$/.test(term) ? typeof value === 'number' && String(value + 1).includes(term) : label.toLocaleLowerCase().includes(term)
}
