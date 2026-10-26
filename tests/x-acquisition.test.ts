import test from 'node:test'
import assert from 'node:assert/strict'
import { createInstance } from 'i18next'
import { readFile } from 'node:fs/promises'
import { createXAcquisitionService } from '../src/games/x/acquisition.ts'
import { xEncounters } from '../src/games/x/encounters.ts'
import { xKnowledge } from '../src/games/x/knowledge.ts'
import { acquisitionText } from '../src/i18n/acquisition-text.ts'
import type { KnowledgeNode } from '../src/domain/species-knowledge.ts'
import type { KnowledgeService } from '../src/games/core/knowledge.ts'
import type { EncounterAtlasData } from '../src/games/core/encounters.ts'

function fakeKnowledge(root?: KnowledgeNode): KnowledgeService {
  return { ...xKnowledge, async evolution(entry, _locale, signal) {
    signal?.throwIfAborted()
    return { root: root ?? { id: entry.id, name: 'fixture', methods: [], children: [] }, labels: {} }
  } }
}
const metadata = async (id: number) => ({ id, egg_groups: [{ name: 'ground' }] })
const service = createXAcquisitionService(xEncounters, fakeKnowledge(), metadata)

test('X capture routes come from Kalos tables and never reuse Black acquisition labels', async () => {
  const routes = await service.routes(25)
  assert.ok(routes.some(route => route.kind === 'capture'))
  assert.ok(routes.some(route => route.kind === 'breed'))
  assert.ok(routes.every(route => 'key' in route.label && route.label.key.startsWith('xAcquisition.')))
  const details = await service.details(25, 'es')
  assert.ok(details.zones.length)
  assert.ok(details.zones.some(zone => zone.areas.some(area => area.methods.some(method => method.encounters.some(row => row.chance !== null)))))
})

test('X fossils preserve choice instructions and gifts never become random encounter percentages', async () => {
  const details = await service.details(696, 'es')
  assert.ok(details.routes.some(route => route.kind === 'fossil'))
  assert.equal(details.routes.some(route => route.kind === 'gift'), false)
  assert.deepEqual(service.instructions(696)[0].label, { key: 'encounterAtlas.specialNotes.fossil' })
  const gifts = details.zones.flatMap(zone => zone.areas.flatMap(area => area.methods.filter(method => method.id === 'gift')))
  assert.ok(gifts.length)
  assert.ok(details.zones.some(zone => zone.areas.some(area => area.label && 'key' in area.label && area.label.key === 'encounterAtlas.unconfirmedArea')))
  assert.ok(gifts.every(method => method.encounters.every(row => row.chance === null)))
})

test('NPC trades retain X requests, special notes and null chance', async () => {
  const details = await service.details(83, 'en')
  assert.ok(details.routes.some(route => route.kind === 'npc-trade'))
  assert.equal(details.trades[0].requested, 'Bunnelby')
  assert.deepEqual(details.trades[0].instructions, { key: 'encounterAtlas.specialNotes.santalune' })
  assert.ok(details.zones.flatMap(zone => zone.areas.flatMap(area => area.methods)).filter(method => method.id === 'npc-trade').every(method => method.encounters.every(row => row.chance === null)))
  const ralts = await service.details(280, 'es')
  assert.ok(ralts.trades.some(trade => typeof trade.requested === 'object' && 'key' in trade.requested && trade.requested.key === 'xAcquisition.anyPokemon'))
})

test('conditional static encounters retain starter restrictions and shiny locks', async () => {
  const bird = await service.details(144, 'en')
  const conditions = bird.zones.flatMap(zone => zone.areas.flatMap(area => area.methods.flatMap(method => method.encounters.flatMap(row => row.conditions))))
  assert.ok(conditions.some(condition => 'key' in condition && condition.key === 'encounterAtlas.conditions.starter-chespin'))
  const xerneas = await service.details(716, 'es')
  assert.ok(xerneas.zones.flatMap(zone => zone.areas.flatMap(area => area.methods.flatMap(method => method.encounters.flatMap(row => row.conditions)))).some(condition => 'key' in condition && condition.key === 'encounterAtlas.shinyLocked'))
})

test('Gen VI requirements use the injected game knowledge, including affection and Fairy moves', async () => {
  const root: KnowledgeNode = { id: 133, name: 'eevee', methods: [], children: [{ id: 700, name: 'sylveon', methods: [{ trigger: { name: 'level-up', url: '' }, min_affection: 2, known_move_type: { name: 'fairy', url: 'type/18' } }], children: [] }] }
  const sylveon = createXAcquisitionService(xEncounters, fakeKnowledge(root), metadata)
  const details = await sylveon.details(700, 'es')
  assert.equal(details.evolution?.from, 'eevee')
  const facts = details.evolution!.methods[0]
  assert.ok(facts.some(fact => 'key' in fact && fact.key === 'speciesKnowledge.conditions.affection'))
  assert.ok(facts.some(fact => 'key' in fact && fact.key === 'speciesKnowledge.conditions.knownType'))
  assert.ok(details.routes.some(route => route.kind === 'evolution'))
  assert.equal(details.routes.some(route => route.kind === 'breed'), false)
})

test('missing local data stays unconfirmed rather than implying transfer or event exclusivity', async () => {
  const routes = await service.routes(19)
  assert.ok(routes.some(route => route.kind === 'unknown'))
  assert.equal(routes.some(route => ['external', 'event'].includes(route.kind)), false)
})

test('slot aggregation keeps conditions and varieties separate and never mutates atlas fixtures', async () => {
  const detail = { area: 'test-area', method: 'horde', minLevel: 5, maxLevel: 5, chance: 10, conditions: [] as string[] }
  const atlas: EncounterAtlasData = { version: 'x', retrieved: '', species: [], locations: [{ id: 1, name: 'test', names: { en: 'Test' }, areas: [{ name: 'test-area', names: {}, rows: [
    { speciesId: 1, name: 'bulbasaur', variety: 'bulbasaur', details: [detail, { ...detail, maxLevel: 7, chance: 20 }, { ...detail, conditions: ['rain'] }] },
    { speciesId: 1, name: 'bulbasaur', variety: 'fixture-form', details: [{ ...detail }] },
  ] }] }] }
  const fixture = createXAcquisitionService(atlas, fakeKnowledge(), metadata)
  const details = await fixture.details(1, 'en')
  const rows = details.zones[0].areas[0].methods[0].encounters
  assert.equal(rows.length, 3)
  assert.deepEqual(rows.map(row => row.chance), [30, 10, 10])
  assert.equal(rows[0].maxLevel, 7)
  assert.equal(detail.chance, 10)
})

test('locale-specific names and adapter labels resolve independently in ES and EN', async () => {
  const resources = Object.fromEntries(await Promise.all(['es', 'en'].map(async locale => [locale, { translation: JSON.parse(await readFile(new URL(`../src/i18n/locales/${locale}/translation.json`, import.meta.url), 'utf8')) }])))
  const i18n = createInstance()
  await i18n.init({ resources, lng: 'es', fallbackLng: false })
  assert.equal(acquisitionText(i18n.getFixedT('es'), service.labels.open, { name: 'Pikachu' }), 'Ver cómo obtener Pikachu en Pokémon X')
  assert.equal(acquisitionText(i18n.getFixedT('en'), service.labels.open, { name: 'Pikachu' }), 'View how to obtain Pikachu in Pokémon X')
  const es = await service.details(83, 'es')
  const en = await service.details(83, 'en')
  assert.notEqual(acquisitionText(i18n.getFixedT('es'), es.trades[0].location), acquisitionText(i18n.getFixedT('en'), en.trades[0].location))
})

test('unsupported species, cancellation and upstream failures propagate to shared retry controls', async () => {
  await assert.rejects(service.routes(722), /Unsupported X species/)
  await assert.rejects(service.details(0, 'es'), /Unsupported X species/)
  await assert.rejects(service.routes(25, AbortSignal.abort()), { name: 'AbortError' })
  const broken = createXAcquisitionService(xEncounters, fakeKnowledge(), async () => { throw new Error('offline') })
  await assert.rejects(broken.routes(25), /offline/)
})


test('baby pre-evolutions can be obtained by breeding despite being unable to breed themselves', async () => {
  const root: KnowledgeNode = { id: 172, name: 'pichu', methods: [], children: [{ id: 25, name: 'pikachu', methods: [{ trigger: { name: 'level-up', url: '' }, min_happiness: 220 }], children: [] }] }
  const babies = createXAcquisitionService(xEncounters, fakeKnowledge(root), async id => ({ id, egg_groups: [{ name: 'no-eggs' }], is_baby: true }))
  assert.equal(await babies.breedingOnly!(172), true)
  assert.ok((await babies.routes(172)).some(route => route.kind === 'breed'))
  const riolu = createXAcquisitionService(xEncounters, fakeKnowledge(), async id => ({ id, egg_groups: [{ name: 'no-eggs' }], is_baby: true }))
  assert.equal(await riolu.breedingOnly!(447), false, 'a recorded local gift/capture prevents a breeding-only marker')
})
