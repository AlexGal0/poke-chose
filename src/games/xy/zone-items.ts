import type { ZoneItem, ZoneItemCategory, ZoneItemOccurrence, ZoneItemsService, ZoneItemMethod, ZoneItemMove } from '../core/zone-items.ts'

type Game = 'x' | 'y'
type Snapshot = typeof import('./data/zone-items.json')
const requests = new Map<string, Promise<Snapshot>>()
function snapshot() {
  if (!requests.has('xy')) requests.set('xy', import('./zone-item-data.ts').then(module => module.default).catch(error => { requests.delete('xy'); throw error }))
  return requests.get('xy')!
}

export function createXYZoneItems(game: Game): ZoneItemsService {
  let index: Promise<{ data: Snapshot; byZone: Map<number, Snapshot['occurrences']>; byItem: Map<string, Snapshot['occurrences']> }> | undefined
  function indexed() {
    if (!index) index = snapshot().then(data => {
      const byZone = new Map<number, Snapshot['occurrences']>()
      const byItem = new Map<string, Snapshot['occurrences']>()
      for (const row of data.occurrences.filter(row => row.versions.includes(game))) {
        byZone.set(row.zoneId, [...byZone.get(row.zoneId) ?? [], row])
        byItem.set(row.itemId, [...byItem.get(row.itemId) ?? [], row])
      }
      return { data, byZone, byItem }
    }).catch(error => { index = undefined; throw error })
    return index
  }
  async function resolve(rows: Snapshot['occurrences'], data: Snapshot, locale: string, signal?: AbortSignal): Promise<ZoneItemOccurrence[]> {
    const { publicMoveData } = await import('../x/move-data.ts')
    signal?.throwIfAborted()
    const language = locale.split('-')[0] === 'es' ? 'es' : 'en'
    return rows.map(row => {
      const definition = data.catalog.find(item => item.id === row.itemId)
      if (!definition) throw new Error('Missing XY zone item')
      const selected = definition.localized[language]
      const english = definition.localized.en
      const item: ZoneItem = { id: definition.id, name: selected.name ?? english.name ?? definition.id, icon: definition.icon,
        category: definition.category as ZoneItemCategory, description: selected.description ?? english.description,
        descriptionLanguage: selected.description || !english.description || language === 'en' ? null : 'en' }
      if ('machine' in definition && definition.machine) {
        const move = publicMoveData.moves.find(move => move.id === definition.machine.moveId)
        if (!move) throw new Error('Missing XY machine move')
        const text = move.localized[language]
        item.machine = { kind: definition.id.startsWith('hm') ? 'hm' : 'tm', number: Number(definition.id.slice(2)), move: {
          generation: publicMoveData.generation, id: move.slug, name: text.name, type: move.type, category: move.categoryId as ZoneItemMove['category'],
          pp: move.pp, power: move.power, accuracy: move.accuracy, description: text.description, descriptionLanguage: text.descriptionLanguage,
        } }
        item.icon = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.machine.kind}-${move.type}.png`
      }
      const instructions = row.instructions as { es?: string; en?: string }
      const requirements = row.requirements as { es?: string; en?: string } | null
      return { id: row.id, zoneId: row.zoneId, item, method: row.method as ZoneItemMethod,
        instructions: instructions[language] ?? instructions.en ?? null,
        instructionsLanguage: instructions[language] || !instructions.en || language === 'en' ? null : 'en',
        requirements: requirements?.[language] ?? requirements?.en ?? null, requirementSource: row.requirementSource, source: row.source,
        ...('purchase' in row && row.purchase ? { purchase: { shop: row.purchase.shop[language], price: row.purchase.price } } : {}) }
    })
  }
  return {
    id: game,
    async load(zoneId, locale, signal) {
      signal?.throwIfAborted()
      const { data, byZone } = await indexed()
      const coverage = data.coverage.find(row => row.zoneId === zoneId)
      return { zoneId, coverage: coverage?.status === 'documented' ? 'documented' : 'unrecorded', source: coverage?.source ?? null,
        retrieved: data.retrieved, occurrences: await resolve(byZone.get(zoneId) ?? [], data, locale, signal) }
    },
    async find(itemId, locale, signal) {
      signal?.throwIfAborted()
      const { data, byItem } = await indexed()
      return resolve(byItem.get(itemId) ?? [], data, locale, signal)
    },
  }
}
