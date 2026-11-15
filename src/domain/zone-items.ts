import type { ZoneItemCategory, ZoneItemOccurrence } from '../games/core/zone-items.ts'

export function groupZoneItems(occurrences: readonly ZoneItemOccurrence[]) {
  const groups = new Map<string, { item: ZoneItemOccurrence['item']; occurrences: ZoneItemOccurrence[] }>()
  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.item.id)
    if (group) group.occurrences.push(occurrence)
    else groups.set(occurrence.item.id, { item: occurrence.item, occurrences: [occurrence] })
  }
  return [...groups.values()]
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
export function filterZoneItems(occurrences: readonly ZoneItemOccurrence[], options: { query: string; category: ZoneItemCategory | 'all'; progress: 'all' | 'marked' | 'unmarked'; marked: ReadonlySet<string> }) {
  const terms = normalize(options.query).split(/\s+/).filter(Boolean)
  return occurrences.filter(occurrence => {
    if (options.category !== 'all' && occurrence.item.category !== options.category) return false
    if (options.progress === 'marked' && !options.marked.has(occurrence.id)) return false
    if (options.progress === 'unmarked' && options.marked.has(occurrence.id)) return false
    const text = normalize([occurrence.item.id, occurrence.item.name, occurrence.item.machine?.move.name, occurrence.instructions].filter(Boolean).join(' '))
    return terms.every(term => text.includes(term))
  })
}
