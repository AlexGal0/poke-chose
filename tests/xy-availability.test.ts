import test from 'node:test'
import assert from 'node:assert/strict'
import { createInstance } from 'i18next'
import { readFile } from 'node:fs/promises'
import { xEncounters } from '../src/games/x/encounters.ts'
import { yEncounters } from '../src/games/y/encounters.ts'
import { createXAcquisitionService } from '../src/games/x/acquisition.ts'
import { createYAcquisitionService } from '../src/games/y/acquisition.ts'
import { xKnowledge } from '../src/games/x/knowledge.ts'
import { independentXYAvailability, xyAvailability, xyExclusiveSpecies } from '../src/games/xy/availability.ts'
import { isCounterpartExclusive, matchesExclusiveSpecies } from '../src/games/core/acquisition.ts'
import type { EncounterAtlasData } from '../src/games/core/encounters.ts'
import type { KnowledgeNode } from '../src/domain/species-knowledge.ts'

const knowledge = { ...xKnowledge, async evolution(entry: { id: number; name: string }) { return { root: { ...entry, methods: [], children: [] }, labels: {} } } }
const metadata = async (id: number) => ({ id, egg_groups: [{ name: 'ground' }] })
const x = createXAcquisitionService(xEncounters, knowledge, metadata)
const y = createYAcquisitionService(yEncounters, knowledge, metadata)

test('exclusive filter uses the complete adapter list before pagination and combines with other filters', async () => {
  const catalog = Array.from({ length: 721 }, (_, index) => index + 1)
  for (const service of [x, y]) {
    const filtered = catalog.filter(id => matchesExclusiveSpecies(id, true, service.exclusiveSpeciesIds))
    assert.equal(filtered.length, 19)
    assert.deepEqual(filtered, [...service.exclusiveSpeciesIds!].sort((a, b) => a - b))
    for (const id of filtered) assert.ok(isCounterpartExclusive(await service.availability!(id)))
    assert.deepEqual(catalog.filter(id => matchesExclusiveSpecies(id, false, service.exclusiveSpeciesIds)), catalog)
  }
  assert.equal(matchesExclusiveSpecies(127, true, x.exclusiveSpeciesIds), true)
  assert.equal(matchesExclusiveSpecies(127, true, y.exclusiveSpeciesIds), false)
  assert.equal(matchesExclusiveSpecies(25, true, x.exclusiveSpeciesIds), false)
  assert.equal(matchesExclusiveSpecies(127, true, undefined), true)
  assert.equal(matchesExclusiveSpecies(127, true, []), false)
  const zone = xEncounters.locations.find(zone => zone.name === 'kalos-route-12')!
  const rows = zone.areas.flatMap(area => area.rows).filter(row => matchesExclusiveSpecies(row.speciesId, true, x.exclusiveSpeciesIds))
  assert.ok(rows.length)
  assert.ok(rows.every(row => row.speciesId === 127))
  assert.equal(rows.filter(row => row.name.includes('pikachu')).length, 0)
})

test('all curated XY exclusives are independently obtainable only in their edition, including breeding and fossils', async () => {
  for (const [game, service, other] of [['x', x, y], ['y', y, x]] as const) for (const id of xyExclusiveSpecies[game]) {
    const own = await service.availability!(id)
    assert.equal(isCounterpartExclusive(own), true, `${game}:${id}`)
    assert.equal(own.counterpart?.gameId, game === 'x' ? 'y' : 'x')
    assert.equal((await other.availability!(id)).independent, 'unobtainable')
    assert.equal(isCounterpartExclusive(await other.availability!(id)), false)
  }
})

test('ordinary species and species requiring a player trade never become independently exclusive', async () => {
  for (const id of [25, 133, 6, 150, 683, 685]) for (const service of [x, y]) assert.equal(isCounterpartExclusive(await service.availability!(id)), false, String(id))
  for (const id of [683, 685]) for (const service of [x, y]) assert.equal((await service.availability!(id)).independent, 'unobtainable')
  await assert.rejects(x.availability!(722), /Unsupported/)
  await assert.rejects(y.availability!(25, AbortSignal.abort()), { name: 'AbortError' })
})

test('Safari-only captures remain in details but never appear as capture or breeding in summary', async () => {
  // A deliberately minimal family supplies no proven evolution route.
  const id = xEncounters.locations.find(zone => zone.name === 'friend-safari')!.areas.flatMap(area => area.rows).find(row =>
    !xEncounters.locations.filter(zone => zone.name !== 'friend-safari').some(zone => zone.areas.some(area => area.rows.some(other => other.speciesId === row.speciesId))) &&
    !(Object.values(xyExclusiveSpecies).flat() as number[]).includes(row.speciesId)
  )!.speciesId
  const details = await x.details(id, 'es')
  assert.ok(details.zones.some(zone => zone.areas.some(area => area.methods.some(method => method.access === 'external'))))
  assert.ok(details.routes.some(route => route.kind === 'capture' && route.access === 'external'))
  assert.deepEqual((await x.routes(id)).map(route => route.kind), ['unknown'])
  assert.equal(xEncounters.locations.find(zone => zone.name === 'friend-safari')?.access, 'external')
})

test('a Safari in the counterpart does not cancel natural exclusivity or advertise external routes', async () => {
  assert.equal(isCounterpartExclusive(await x.availability!(127)), true)
  assert.equal((await y.routes(127)).some(route => route.kind === 'capture' || route.kind === 'breed'), false)
  assert.ok((await y.details(127, 'en')).zones.length)
  assert.ok((await x.routes(345)).some(route => route.kind === 'fossil' && route.access === 'independent'))
})

test('independent evolution and breeding require a local ancestor; trades and missing evidence are not inferred', () => {
  const fixture: EncounterAtlasData = { version: 'x', retrieved: null, species: [], locations: [{ id: 1, name: 'route', names: {}, areas: [{ name: 'route', names: {}, rows: [1, 132].map(id => ({ speciesId: id, name: String(id), variety: String(id), details: [{ area: 'route', method: 'walk', minLevel: 1, maxLevel: 2, chance: 10, conditions: [] }] })) }] }] }
  const root: KnowledgeNode = { id: 1, name: 'bulbasaur', methods: [], children: [{ id: 2, name: 'ivysaur', methods: [{ trigger: { name: 'level-up', url: '' }, min_level: 16 }], children: [] }] }
  assert.equal(independentXYAvailability('x', 2, fixture, root), 'obtainable')
  const trade = structuredClone(root)
  trade.children[0].methods = [{ trigger: { name: 'trade', url: '' } }]
  assert.equal(independentXYAvailability('x', 2, fixture, trade), 'unknown')
  const empty = { ...fixture, locations: [] }
  assert.equal(independentXYAvailability('x', 2, empty, root), 'unknown')
  assert.equal(isCounterpartExclusive(xyAvailability('x', 2, fixture, empty, root)), false)
})

test('exclusive labels and counterpart explanations resolve in Spanish and English', async () => {
  const resources = Object.fromEntries(await Promise.all(['es', 'en'].map(async locale => [locale, { translation: JSON.parse(await readFile(new URL(`../src/i18n/locales/${locale}/translation.json`, import.meta.url), 'utf8')) }])))
  const i18n = createInstance()
  await i18n.init({ resources, lng: 'es', fallbackLng: false })
  for (const locale of ['es', 'en']) {
    const t = i18n.getFixedT(locale)
    assert.ok(t('acquisitionAvailability.exclusive', { game: 'Pokémon X' }).includes('Pokémon X'))
    assert.ok(t('acquisitionAvailability.exclusiveHint', { game: 'Pokémon X', counterpart: 'Pokémon Y' }).includes('Pokémon Y'))
  }
})

test('NPC exchanges require locally obtainable requested species and cannot bootstrap a circular chain', () => {
  const species = [10, 11, 12].map(id => ({ id, name: String(id), types: ['bug'], sprite: null }))
  const rows = species.map((pokemon, index) => ({ speciesId: pokemon.id, name: pokemon.name, variety: pokemon.name, details: [{ area: 'fixture', method: 'npc-trade', minLevel: 5, maxLevel: 5, chance: null, conditions: [], trade: { requested: String(species[(index + 1) % species.length].id), instructionsKey: 'fixture' } }] }))
  const data: EncounterAtlasData = { version: 'x', retrieved: null, species, locations: [{ id: 1, name: 'fixture', names: {}, areas: [{ name: 'fixture', names: {}, rows }] }] }
  assert.equal(independentXYAvailability('x', 10, data), 'unknown')
  const local = structuredClone(data)
  local.locations[0].areas[0].rows[1].details.push({ area: 'fixture', method: 'walk', minLevel: 5, maxLevel: 5, chance: 10, conditions: [] })
  assert.equal(independentXYAvailability('x', 10, local), 'obtainable')
  assert.equal(independentXYAvailability('x', 12, local), 'obtainable')
})

test('breeding can recover a base from a local evolution but Safari parents cannot provide local offspring', () => {
  const root: KnowledgeNode = { id: 1, name: 'bulbasaur', methods: [], children: [{ id: 2, name: 'ivysaur', methods: [], children: [] }] }
  const data: EncounterAtlasData = { version: 'x', retrieved: null, species: [], locations: [{ id: 1, name: 'route', names: {}, areas: [{ name: 'route', names: {}, rows: [2, 132].map(id => ({ speciesId: id, name: String(id), variety: String(id), details: [{ area: 'route', method: 'walk', minLevel: 1, maxLevel: 2, chance: 10, conditions: [] }] })) }] }] }
  assert.equal(independentXYAvailability('x', 1, data, root), 'obtainable')
  const safari = structuredClone(data)
  safari.locations[0].name = 'friend-safari'
  assert.equal(independentXYAvailability('x', 1, safari, root), 'unknown')
})
