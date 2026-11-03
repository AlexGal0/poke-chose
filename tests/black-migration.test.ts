import { blackSavedRosterService } from '../src/games/black/saved-roster.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import { blackCatalogRules } from '../src/games/black/catalog.ts'
import { blackManualStorage } from '../src/games/black/storage.ts'
import { blackKnowledgeTree } from '../src/games/black/knowledge.ts'
import { blackEncounterZones } from '../src/games/black/encounters.ts'
import { emptyBlackSource, advanceBlackSource } from '../src/games/black/source-state.ts'
import { resolveSavedRoster } from '../src/games/core/saved-roster.ts'
import { parsePk5 } from '../bridge/parser.ts'
import { pk5Fixture } from './helpers/save-fixture.ts'
import i18n from '../src/i18n/index.ts'
import { encounterResourceLabel, encounterAreaLabel } from '../src/i18n/encounter-atlas.ts'

const party = [parsePk5(pk5Fixture())]
const snapshot = { status: 'ready', message: 'waiting', updatedAt: '2026-10-30T12:00:00Z', backup: false,
  party, boxes: [], pokedex: { seenSpeciesIds: [502], caughtSpeciesIds: [502] } }

test('Black source keeps raw identities and independently retains unavailable fields as stale', () => {
  const ready = advanceBlackSource(emptyBlackSource, { type: 'snapshot', snapshot }, 'save', false)
  assert.equal(ready.party?.[0].personality, party[0].personality)
  assert.deepEqual(ready.boxes, [])
  assert.equal(ready.pokedex?.caughtSpeciesIds.has(502), true)
  const partial = advanceBlackSource(ready, { type: 'snapshot', snapshot: { ...snapshot, party: null, boxes: null, pokedex: null } }, 'save', false)
  assert.equal(partial.party, ready.party)
  assert.equal(partial.pokedex, ready.pokedex)
  assert.equal(partial.partyStale, true)
  assert.equal(partial.pokedexStale, true)
  assert.equal(partial.collectionError, true)
  const invalid = advanceBlackSource(ready, { type: 'snapshot', snapshot: { ...snapshot, party: [{ ...party[0], speciesId: 700 }] } }, 'save', false)
  assert.equal(invalid.error, true)
  assert.equal(invalid.party, ready.party)
  const lost = advanceBlackSource(ready, { type: 'connection', connected: false, message: null }, 'save', false)
  assert.equal(lost.party, ready.party)
  assert.equal(lost.partyStale, true)
  assert.equal(lost.repelStale, true)
  assert.equal(emptyBlackSource.party, null)
})

test('shared roster distinguishes unread boxes from empty boxes and preserves duplicate individuals', async () => {
  const service = { resolve: async () => ({ id: 502, name: 'dewott', sprite: null, types: ['water'] }), describe: async () => ({ moves: [], ability: '', item: '' }) }
  const unread = await resolveSavedRoster(service, party, undefined)
  assert.equal(unread.party.length, 1)
  assert.equal(unread.collection, null)
  const empty = await resolveSavedRoster(service, party, [])
  assert.equal(empty.collection?.length, 1)
  const duplicate = await resolveSavedRoster(service, party, [{ ...party[0], box: 23, slot: 29 }])
  assert.equal(duplicate.collection?.length, 2)
  assert.notEqual(duplicate.collection?.[0].instanceKey, duplicate.collection?.[1].instanceKey)
  assert.equal(duplicate.collection?.[1].box, 23)
})

test('Black manual storage preserves the original key and does not widen Gen V validation', () => {
  const previous = globalThis.localStorage
  const values = new Map<string, string>()
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } } as Storage
  try {
    values.set('poke-chose:bw:v1', JSON.stringify({ collection: [{ id: 502, name: 'dewott', sprite: null, types: ['water'] }], teamIds: [502] }))
    const state = blackManualStorage.load()
    assert.deepEqual(state.teamIds, [502])
    assert.equal(state.collection[0].scope?.id, 'unova')
    assert.equal(blackManualStorage.save(state), true)
    assert.equal(values.has('poke-chose:black:manual:v1'), false)
    assert.equal(blackCatalogRules.types.includes('fairy'), false)
    assert.equal(blackManualStorage.save({ collection: [{ id: 700, name: 'sylveon', sprite: null, types: ['fairy'] }], teamIds: [] }), false)
  } finally { globalThis.localStorage = previous }
})

test('Black family normalization preserves special requirements and branching without mutating the tree', () => {
  const tree = { speciesId: 133, name: 'eevee', methods: [], children: [{ speciesId: 470, name: 'leafeon', children: [], methods: [{ trigger: { name: 'level-up', url: '' }, near_special_rock: true, location: { name: 'pinwheel-forest', url: '/location/375/' } }] }] }
  const normalized = blackKnowledgeTree(tree)
  assert.equal(normalized.children[0].id, 470)
  assert.equal(normalized.children[0].methods[0].near_special_rock, true)
  assert.equal(normalized.children[0].methods[0].location?.name, 'pinwheel-forest')
  assert.notEqual(normalized.children[0].methods[0], tree.children[0].methods[0])
})

test('Black encounter adapter retains subzones, itinerary stages, trade requirements and bilingual labels', () => {
  const detail = { area: 'nacrene-city-area', method: 'npc-trade', minLevel: 15, maxLevel: 15, chance: null, conditions: ['season-summer'], trade: { requested: 'Cottonee', instructionsKey: 'petilil' } }
  const zones = blackEncounterZones([{ location: { id: 349, name: 'nacrene-city' }, rows: [{ speciesId: 548, name: 'petilil', details: [detail] }] }])
  const row = zones[0].areas[0].rows[0]
  assert.equal(row.details[0].trade?.requested, 'Cottonee')
  assert.equal(row.details[0].trade?.instructionsKey, 'npcTrades.instructions.petilil')
  assert.deepEqual(row.details[0].conditions, ['season-summer'])
  assert.equal(detail.trade.instructionsKey, 'petilil')
  for (const locale of ['es', 'en']) {
    const t = i18n.getFixedT(locale)
    assert.ok(!encounterResourceLabel(zones[0], locale, t).includes('zones.'))
    assert.ok(!encounterAreaLabel(t, zones[0].areas[0], zones[0], locale).includes('zones.'))
    assert.ok(i18n.exists(row.details[0].trade!.instructionsKey, { lng: locale }))
  }
})


test('a box resolver failure does not hide the successfully resolved party', async () => {
  const service = { resolve: async (member: { speciesId: number }) => {
    if (member.speciesId === 1) throw new Error('Optional PC species data unavailable')
    return { id: member.speciesId, name: 'dewott', sprite: null, types: ['water'] }
  }, describe: async () => ({ moves: [], ability: '', item: '' }) }
  const result = await resolveSavedRoster(service, party, [{ ...party[0], speciesId: 1, box: 0, slot: 0 }])
  assert.equal(result.party.length, 1)
  assert.equal(result.collection, null)
  assert.equal(result.collectionError, true)
})


test('Black roster metadata retains Gen V move values, locale fallback and physical move slots', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async input => {
    const path = String(input)
    if (path.includes('/ability/')) return new Response(JSON.stringify({ name: 'overgrow', names: [{ name: 'Overgrow', language: { name: 'en' } }] }))
    if (path.includes('/move/')) return new Response(JSON.stringify({ name: 'surf', names: [{ name: 'Surf', language: { name: 'en' } }], type: { name: 'water' }, pp: 15, damage_class: { name: 'special' }, power: 90, accuracy: 100,
      flavor_text_entries: [{ flavor_text: 'Generation V description', language: { name: 'en' }, version_group: { name: 'black-white' } }],
      past_values: [{ type: null, pp: null, power: 95, accuracy: null, version_group: { name: 'x-y', url: 'https://pokeapi.co/api/v2/version-group/15/' } }] }))
    throw new Error(`Unexpected public lookup: ${path}`)
  }
  try {
    const member = { ...party[0], heldItemId: 0, moveIds: [0, 57, 0, 57] as [number, number, number, number] }
    const result = await blackSavedRosterService.describe(member, 'es')
    assert.equal(result.ability, 'Overgrow')
    assert.equal(result.item, '')
    assert.deepEqual(result.knownMoves?.map(move => move.slot), [1, 3])
    assert.equal(result.knownMoves?.[0].power, 95)
    assert.equal(result.knownMoves?.[0].description, 'Generation V description')
    assert.equal(result.knownMoves?.[0].descriptionLanguage, 'en')
  } finally { globalThis.fetch = original }
})


test('optional ability failure does not hide a known empty move set or report a missing held item', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Ability service unavailable') }
  try {
    const result = await blackSavedRosterService.describe({ ...party[0], heldItemId: 0, abilityId: 999, moveIds: [0, 0, 0, 0] }, 'es')
    assert.equal(result.abilityError, true)
    assert.equal(result.itemError, false)
    assert.equal(result.knownMovesError, false)
    assert.deepEqual(result.knownMoves, [])
  } finally { globalThis.fetch = original }
})


test('initial backup or stopped snapshots remain visible with explicit stale state', () => {
  for (const event of [{ type: 'snapshot' as const, snapshot: { ...snapshot, backup: true } }, { type: 'snapshot' as const, snapshot, connected: false }]) {
    const retained = advanceBlackSource(emptyBlackSource, event, 'save', false)
    assert.equal(retained.party?.length, 1)
    assert.deepEqual(retained.boxes, [])
    assert.equal(retained.error, true)
    assert.equal(retained.partyStale, true)
    assert.equal(retained.pokedexStale, true)
    assert.equal(retained.pokedex?.caughtSpeciesIds.has(502), true)
  }
})
