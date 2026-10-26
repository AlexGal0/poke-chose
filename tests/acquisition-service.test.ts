import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createInstance } from 'i18next'
import { createBlackAcquisitionService, normalizeBlackAcquisition } from '../src/games/black/acquisition.ts'
import { acquisitionText } from '../src/i18n/acquisition-text.ts'
import type { AcquisitionText } from '../src/games/core/acquisition.ts'
import type { getAcquisitionDetails } from '../src/api/acquisition-details.ts'

type RawDetails = Awaited<ReturnType<typeof getAcquisitionDetails>>
function fixture(): RawDetails {
  const node = { speciesId: 549, name: 'lilligant', methods: [{ trigger: { name: 'use-item', url: '' }, item: { name: 'sun-stone', url: 'item/80' } }], children: [] }
  const parent = { speciesId: 548, name: 'petilil', methods: [], children: [node] }
  return {
    tags: [{ kind: 'capture', icon: '🌿' }],
    encounters: [{ area: 'pinwheel-forest-area', method: { name: 'walk' }, min_level: 10, max_level: 12, chance: 20, condition_values: [{ name: 'season-summer' }] }],
    tree: { root: parent, pokemon: {}, labels: { 'item/80': 'Piedra Solar' } }, node, parent,
  }
}

test('Black adapter groups encounter slots and preserves conditions, unknown locations and input data', () => {
  const raw = fixture()
  raw.encounters.push({ ...raw.encounters[0], min_level: 13, max_level: 15, chance: 10 })
  raw.encounters.push({ ...raw.encounters[0], condition_values: [{ name: 'season-winter' }] })
  raw.encounters.push({ ...raw.encounters[0], area: 'unverified-area', condition_values: [{ name: 'special-event' }] })
  const result = normalizeBlackAcquisition(549, raw)
  assert.equal(result.zones.length, 2)
  const rows = result.zones[0].areas[0].methods[0].encounters
  assert.deepEqual([rows[0].minLevel, rows[0].maxLevel, rows[0].chance], [10, 15, 30])
  assert.deepEqual(rows[0].conditions, [{ key: 'encounterSeasons.list.season-summer' }])
  assert.equal(rows.length, 2)
  assert.deepEqual(result.zones[1].label, { key: 'zones.area.unknown', params: { raw: 'unverified area' } })
  assert.deepEqual(result.zones[1].areas[0].methods[0].encounters[0].conditions, [{ text: 'special-event' }])
  assert.equal(raw.encounters[0].chance, 20)
})

test('NPC trades have no random percentage and keep Black-specific requirements in the adapter', () => {
  const raw = fixture()
  raw.encounters[0].method.name = 'npc-trade'
  const result = normalizeBlackAcquisition(548, raw)
  assert.equal(result.zones[0].areas[0].methods[0].encounters[0].chance, null)
  assert.equal(result.trades[0].requested, 'Cottonee')
  assert.deepEqual(result.trades[0].instructions, { key: 'npcTrades.instructions.petilil' })
  assert.deepEqual(result.trades[0].location, { key: 'zones.list.nacrene-city' })
  assert.deepEqual(normalizeBlackAcquisition(549, raw).trades, [])
})

test('evolution requirements are normalized without exporting legacy trees or API responses', () => {
  const result = normalizeBlackAcquisition(549, fixture())
  assert.equal(result.evolution?.from, 'petilil')
  assert.deepEqual(result.evolution?.methods, [[{ key: 'evolutionMethod.useItem', params: { item: 'Piedra Solar' } }]])
  assert.equal('tree' in result, false)
  const raw = fixture()
  raw.parent = null
  assert.equal(normalizeBlackAcquisition(548, raw).evolution, null)
})

test('service forwards species, locale and cancellation and exposes special instructions independently', async () => {
  const controller = new AbortController()
  const calls: unknown[][] = []
  const service = createBlackAcquisitionService({
    async routes(id, signal) { calls.push([id, signal]); return [{ kind: 'gift', icon: '🎁' }] },
    async details(id, locale, signal) { calls.push([id, locale, signal]); return fixture() },
  })
  assert.deepEqual((await service.routes(549, controller.signal))[0], { kind: 'gift', icon: '🎁', label: { key: 'acquisition.label.gift' } })
  await service.details(549, 'en', controller.signal)
  assert.deepEqual(calls, [[549, controller.signal], [549, 'en', controller.signal]])
  assert.deepEqual(service.instructions(570)[0].label, { key: 'acquisitionDetails.instructions.zorua' })
  assert.deepEqual(service.instructions(506), [])
})

test('service propagates failed and aborted reads for the shared retry lifecycle', async () => {
  const service = createBlackAcquisitionService({
    async routes() { throw new Error('unavailable') },
    async details(_id, _locale, signal) { signal?.throwIfAborted(); return fixture() },
  })
  await assert.rejects(service.routes(549), /unavailable/)
  await assert.rejects(service.details(549, 'es', AbortSignal.abort()), { name: 'AbortError' })
})

test('shared presentation resolves nested labels in ES/EN and accepts raw labels without game assumptions', async () => {
  const resources = Object.fromEntries(await Promise.all(['es', 'en'].map(async locale => [locale, { translation: JSON.parse(await readFile(new URL(`../src/i18n/locales/${locale}/translation.json`, import.meta.url), 'utf8')) }])))
  const instance = createInstance()
  await instance.init({ resources, lng: 'es', fallbackLng: false })
  const label: AcquisitionText = { key: 'zones.area.main', params: { zone: { key: 'zones.list.pinwheel-forest' } } }
  assert.equal(acquisitionText(instance.getFixedT('es'), label), 'Bosque Azulejo · Zona principal')
  assert.equal(acquisitionText(instance.getFixedT('en'), label), 'Pinwheel Forest · Main area')
  assert.equal(acquisitionText(instance.getFixedT('en'), { text: 'Adapter locality' }), 'Adapter locality')
  assert.equal(acquisitionText(instance.getFixedT('en'), { key: 'acquisitionDetails.open' }, { name: 'Petilil' }), 'View how to obtain Petilil in Pokémon Black')
})
