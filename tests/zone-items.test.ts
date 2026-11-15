import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { yZoneItems } from '../src/games/y/zone-items.ts'
import { xZoneItems } from '../src/games/x/zone-items.ts'
import { ZONE_ITEM_CATEGORIES } from '../src/games/core/zone-items.ts'
import { groupZoneItems, filterZoneItems } from '../src/domain/zone-items.ts'
import { loadZoneItemProgress, saveZoneItemProgress } from '../src/storage/zone-item-progress.ts'

test('XY location data has unique occurrences, valid metadata and explicit version/coverage provenance', () => {
  const data = JSON.parse(readFileSync(new URL('../src/games/xy/data/zone-items.json', import.meta.url), 'utf8'))
  assert.equal(data.versionGroup, 'x-y')
  assert.ok(data.occurrences.length > 600)
  assert.equal(new Set(data.occurrences.map((row: { id: string }) => row.id)).size, data.occurrences.length)
  assert.equal(new Set(data.catalog.map((row: { id: string }) => row.id)).size, data.catalog.length)
  for (const row of data.occurrences) {
    assert.ok(data.catalog.some((item: { id: string }) => item.id === row.itemId), row.itemId)
    assert.ok(data.coverage.some((zone: { zoneId: number }) => zone.zoneId === row.zoneId))
    assert.ok(row.versions.length && row.versions.every((version: string) => ['x', 'y'].includes(version)))
    assert.ok(row.source.startsWith('https://www.serebii.net/pokearth/kalos/'))
    assert.ok(['pickup', 'hidden', 'gift', 'reward', 'exchange', 'purchase', 'harvest', 'unknown'].includes(row.method))
  }
  for (const item of data.catalog) {
    assert.ok(ZONE_ITEM_CATEGORIES.includes(item.category))
    assert.ok(item.localized.en.name)
    assert.notEqual(item.id, 'laultra-ball') // Legends-only duplicate must not win Ultra Ball name resolution.
  }
})

test('Y provides evolution items, NPC exchanges, hidden pickups and source notes separately', async () => {
  const result = await yZoneItems.load(624, 'es')
  assert.equal(result.coverage, 'documented')
  const stone = result.occurrences.find(row => row.item.id === 'sun-stone')!
  assert.equal(stone.item.category, 'evolution')
  assert.equal(stone.method, 'exchange')
  assert.ok(stone.instructions?.includes('Piedra Insólita'))
  assert.equal(stone.instructionsLanguage, null)
  const hidden = result.occurrences.find(row => row.item.id === 'stardust' && row.method === 'hidden')!
  assert.ok(hidden.instructions)
  assert.equal(hidden.instructionsLanguage, 'en')
  assert.ok(result.occurrences.some(row => row.method === 'gift'))
  assert.ok((await yZoneItems.load(596, 'es')).occurrences.some(row => row.item.id === 'exp-share' && row.item.category === 'key'))
})

test('machine metadata uses XY moves, including type, category, PP, historical power and accuracy', async () => {
  const infestation = (await yZoneItems.find('tm83', 'es'))[0].item.machine!
  assert.equal(infestation.kind, 'tm')
  assert.equal(infestation.number, 83)
  assert.equal(infestation.move.id, 'infestation')
  assert.equal(infestation.move.type, 'bug')
  assert.equal(infestation.move.pp, 20)
  assert.equal(infestation.move.power, 20)
  assert.equal(infestation.move.accuracy, 100)
  assert.equal(infestation.move.category, 'special')
  assert.equal(infestation.move.generation, 6)
  assert.ok(infestation.move.description)
  const surf = (await yZoneItems.find('hm03', 'en'))[0].item.machine!
  assert.equal(surf.kind, 'hm')
  assert.equal(surf.number, 3)
  assert.equal(surf.move.name, 'Surf')
  assert.equal(surf.move.pp, 15)
  assert.equal(surf.move.power, 90) // Gen V is 95, but XY is 90.
  const punch = (await yZoneItems.find('tm98', 'en'))[0].item.machine!
  assert.equal(punch.move.id, 'power-up-punch')
  assert.equal(punch.move.power, 40)
  assert.equal(punch.move.pp, 20)
})

test('X mirrors the service while preserving exclusive stones, gifts and fossils', async () => {
  assert.equal((await yZoneItems.find('pinsirite', 'es')).length, 0)
  assert.ok((await xZoneItems.find('pinsirite', 'es')).length)
  assert.equal((await xZoneItems.find('heracronite', 'es')).length, 0)
  const heracronite = (await yZoneItems.find('heracronite', 'es'))[0]
  assert.ok(heracronite.requirements?.includes('20:00'))
  assert.ok(heracronite.requirementSource)
  assert.equal((await yZoneItems.find('charizardite-x', 'en')).length, 0)
  assert.equal((await xZoneItems.find('mewtwonite-y', 'en')).length, 0)
  assert.ok((await yZoneItems.find('helix-fossil', 'en')).length)
  assert.equal((await xZoneItems.find('helix-fossil', 'en')).length, 0)
  const x = await xZoneItems.load(624, 'en'), y = await yZoneItems.load(624, 'en')
  assert.deepEqual(x.occurrences, y.occurrences)
})

test('reverse lookup returns the same stable occurrences as zone lookup, including purchases', async () => {
  const occurrences = await yZoneItems.find('tm28', 'en')
  assert.ok(occurrences.some(row => row.zoneId === 624 && row.method === 'purchase'))
  for (const row of occurrences) {
    const zone = await yZoneItems.load(row.zoneId, 'en')
    assert.deepEqual(zone.occurrences.find(other => other.id === row.id), row)
  }
  assert.deepEqual(await yZoneItems.find('not-an-item', 'en'), [])
})

test('XY preserves both shop counters and separately selectable subzones', async () => {
  const city = await yZoneItems.load(624, 'es')
  assert.ok(city.occurrences.some(row => row.item.id === 'ultra-ball' && row.method === 'purchase' && row.instructions?.includes('mostrador izquierdo')))
  const purchase = city.occurrences.find(row => row.item.id === 'ultra-ball' && row.method === 'purchase')!
  assert.deepEqual(purchase.purchase, { shop: 'Tienda Pokémon · mostrador izquierdo', price: '1200' })
  const english = (await yZoneItems.load(624, 'en')).occurrences.find(row => row.id === purchase.id)!
  assert.equal(english.purchase?.shop, 'PokéMart - Left Counter')
  assert.equal(english.purchase?.price, purchase.purchase?.price)
  assert.ok(city.occurrences.some(row => row.item.id === 'tm28' && row.instructions?.includes('mostrador derecho')))
  assert.equal(city.occurrences.find(row => row.item.id === 'soothe-bell')!.item.category, 'held')
  assert.ok((await yZoneItems.load(605, 'en')).occurrences.length)
  assert.ok((await yZoneItems.load(600, 'en')).occurrences.some(row => row.item.id === 'tm24'))
  assert.ok((await yZoneItems.load(1121, 'en')).occurrences.some(row => row.item.id === 'sprinklotad'))
  assert.ok(!(await yZoneItems.load(599, 'en')).occurrences.some(row => row.item.id === 'tm24'))
})

test('unknown coverage is distinct from filters with zero matches and cancellation is honored', async () => {
  const unknown = await yZoneItems.load(2000001, 'es')
  assert.equal(unknown.coverage, 'unrecorded')
  assert.deepEqual(unknown.occurrences, [])
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(yZoneItems.load(624, 'es', controller.signal))
  await assert.rejects(yZoneItems.find('sun-stone', 'es', controller.signal))
})

test('grouping and filtering retain independent obtaining points without mutating source data', async () => {
  const result = await yZoneItems.load(624, 'es')
  const before = JSON.stringify(result)
  const stardust = groupZoneItems(result.occurrences).find(group => group.item.id === 'stardust')!
  assert.ok(stardust.occurrences.length >= 2)
  const marked = new Set([stardust.occurrences[0].id])
  const filtered = filterZoneItems(result.occurrences, { query: 'polvo estelar', category: 'all', progress: 'marked', marked })
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].id, stardust.occurrences[0].id)
  assert.equal(filterZoneItems(result.occurrences, { query: 'Surf', category: 'machine', progress: 'all', marked }).length, 1)
  assert.equal(JSON.stringify(result), before)
})

test('manual obtained marks remain independent between X and Y and tolerate unavailable storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } })
    assert.ok(saveZoneItemProgress('y', new Set(['same-occurrence'])))
    assert.deepEqual([...loadZoneItemProgress('y')], ['same-occurrence'])
    assert.equal(loadZoneItemProgress('x').size, 0)
    values.set('poke-chose:y:zone-item-progress:v1', '{broken')
    assert.equal(loadZoneItemProgress('y').size, 0)
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked') } })
    assert.equal(loadZoneItemProgress('y').size, 0)
    assert.equal(saveZoneItemProgress('y', new Set(['sample'])), false)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
