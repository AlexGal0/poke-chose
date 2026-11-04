import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createInstance } from 'i18next'
import { GAME_PROFILES } from '../src/games/profiles.ts'
import { yCatalog, yCatalogRules } from '../src/games/y/catalog.ts'
import { xCatalogRules } from '../src/games/x/catalog.ts'
import { yKnowledge } from '../src/games/y/knowledge.ts'
import { yEncounters } from '../src/games/y/encounters.ts'
import { xEncounters } from '../src/games/x/encounters.ts'
import { createYAcquisitionService } from '../src/games/y/acquisition.ts'
import { yCollectionMoves } from '../src/games/y/collection-service.ts'
import { yEvolutionRequirements } from '../src/games/y/evolution-requirements.ts'
import { yAlbum } from '../src/games/y/album.ts'
import { xAlbum } from '../src/games/x/album.ts'
import { createManualStorage } from '../src/games/core/manual-storage.ts'
import { isManualPokemon } from '../src/games/core/catalog.ts'
import { generationVIRules } from '../src/domain/type-rules.ts'
import { acquisitionText } from '../src/i18n/acquisition-text.ts'

function withStorage(action: (values: Map<string, string>) => Promise<void> | void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } })
  return Promise.resolve().then(() => action(values)).finally(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  })
}

test('Y has its own profile and explicitly declares supported sources independently of X', () => {
  const y = GAME_PROFILES.find(profile => profile.id === 'y')!
  assert.equal(y.generation, 6)
  for (const module of ['team', 'catalog', 'collection', 'captures', 'analysis', 'types', 'evolutions', 'moves', 'statistics'] as const) assert.equal(y.modules[module], true)
  for (const module of ['save', 'live', 'battle', 'location', 'daycare'] as const) assert.equal(y.modules[module], true)
  assert.equal(y.modules.repel, false)
  assert.equal(yKnowledge.rules.gameId, 'y')
  assert.equal(yKnowledge.rules.versionGroup, 'x-y')
  assert.equal(yKnowledge.rules.generation, 6)
  assert.equal(yCatalogRules.id, 'y')
  assert.equal(yCatalogRules.types.length, 18)
  assert.ok(yCatalogRules.types.includes('fairy'))
  assert.deepEqual(yCatalogRules.regionalSpeciesIds, xCatalogRules.regionalSpeciesIds)
  assert.equal(generationVIRules.generation, 6)
})

test('Y catalog contains all 721 Gen VI species without mistaking regional membership for availability', async () => {
  const rows = await yCatalog.list()
  assert.equal(rows.length, 721)
  assert.equal(rows.find(row => row.id === 700)?.name, 'sylveon')
  assert.ok(rows.some(row => row.id === 716)) // Xerneas remains in the catalog, not Y encounter tables.
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(yCatalog.list(controller.signal))
  assert.equal(isManualPokemon({ id: 722, name: 'rowlet', types: ['grass'], sprite: null }, yCatalogRules), false)
})

test('Y collection and team persistence never reads or overwrites X or Black', async () => {
  await withStorage(values => {
    const x = createManualStorage(xCatalogRules)
    const y = createManualStorage(yCatalogRules)
    const xState = { collection: [{ id: 684, name: 'swirlix', types: ['fairy'], sprite: null }], teamIds: [684] }
    const yState = { collection: [{ id: 682, name: 'spritzee', types: ['fairy'], sprite: null }], teamIds: [682] }
    values.set('poke-chose:bw:v1', 'untouched')
    assert.ok(x.save(xState))
    assert.deepEqual(y.load(), { collection: [], teamIds: [] })
    assert.ok(y.save(yState))
    assert.deepEqual(y.load(), yState)
    assert.deepEqual(x.load(), xState)
    assert.equal(values.get('poke-chose:bw:v1'), 'untouched')
    assert.ok(values.has('poke-chose:y:manual:v1'))
  })
})

test('Y atlas is downloaded for Y and preserves version differences without copying X tables', () => {
  const raw = JSON.parse(readFileSync(new URL('../src/games/y/data/encounters.json', import.meta.url), 'utf8'))
  assert.equal(raw.version, 'y')
  assert.equal(raw.source, 'https://pokeapi.co/api/v2/')
  assert.ok(Number.isFinite(Date.parse(raw.retrieved)))
  assert.equal(raw.locations.length, 46)
  const rows = (data: typeof yEncounters) => data.locations.filter(zone => zone.name !== 'friend-safari').flatMap(zone => zone.areas.flatMap(area => area.rows))
  const y = rows(yEncounters), x = rows(xEncounters)
  for (const id of [682, 690, 717]) {
    assert.ok(y.some(row => row.speciesId === id), String(id))
    assert.ok(!x.some(row => row.speciesId === id), String(id))
  }
  for (const id of [684, 692, 716]) {
    assert.ok(x.some(row => row.speciesId === id), String(id))
    assert.ok(!y.some(row => row.speciesId === id), String(id))
  }
  const route2 = yEncounters.locations.find(zone => zone.id === 591)!.areas.flatMap(area => area.rows)
  assert.ok(route2.some(row => row.name === 'caterpie'))
  assert.ok(!route2.some(row => row.name === 'weedle'))
  assert.equal(new Set(yEncounters.locations.map(zone => zone.id)).size, yEncounters.locations.length)
  for (const zone of yEncounters.locations) for (const area of zone.areas) for (const row of area.rows) {
    assert.ok(yEncounters.species.some(species => species.id === row.speciesId), row.name)
    for (const detail of row.details) {
      assert.ok(detail.minLevel >= 1 && detail.maxLevel <= 100 && detail.minLevel <= detail.maxLevel)
      assert.ok(detail.chance === null || detail.chance >= 0 && detail.chance <= 100)
      assert.equal(detail.area, area.name)
    }
  }
})

test('Y acquisition labels and details use Y data in Spanish and English', async () => {
  const knowledge = { ...yKnowledge, async evolution(entry: { id: number; name: string }) {
    return { root: { ...entry, methods: [], children: [] }, labels: {} }
  } }
  const service = createYAcquisitionService(yEncounters, knowledge, async id => ({ id, egg_groups: [{ name: 'ground' }] }))
  assert.equal(service.id, 'y')
  assert.equal(service.gameName, 'POKÉMON Y')
  const yveltal = await service.details(717, 'es')
  assert.ok(yveltal.routes.some(route => route.kind === 'static'))
  assert.ok(yveltal.zones.length)
  assert.equal((await service.details(716, 'en')).zones.length, 0)
  const fossil = await service.routes(696)
  assert.ok(fossil.some(route => route.kind === 'fossil'))
  for (const locale of ['es', 'en']) {
    const translation = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${locale}/translation.json`, import.meta.url), 'utf8'))
    const i18n = createInstance()
    await i18n.init({ lng: locale, resources: { [locale]: { translation } } })
    for (const label of [service.labels.open, service.labels.group, ...yveltal.routes.map(route => route.label)]) {
      const value = acquisitionText(i18n.t, label, { name: 'Yveltal' })
      assert.ok(!value.includes('Pokémon X'), value)
      assert.ok(!value.includes('yAcquisition.'), value)
    }
    assert.ok(acquisitionText(i18n.t, service.labels.open, { name: 'Yveltal' }).includes('Pokémon Y'))
  }
  await assert.rejects(service.routes(722))
})

test('Y shares XY field compatibility and evolution scope, not player inventory', async () => {
  assert.deepEqual(await yCollectionMoves.load('25:0'), ['strength', 'dig', 'flash', 'rock-smash'])
  await assert.rejects(yCollectionMoves.load('722:0'))
  assert.equal(yEvolutionRequirements.inScope(682, 'regional'), true)
  assert.equal(yEvolutionRequirements.inScope(722, 'all'), false)
})

test('album prefers Y text and keeps locale-aware caches separate from X', async () => {
  await withStorage(async values => {
    const original = globalThis.fetch
    globalThis.fetch = async () => Response.json({ flavor_text_entries: [
      { flavor_text: 'X text', language: { name: 'en' }, version: { name: 'x' } },
      { flavor_text: 'Y text', language: { name: 'en' }, version: { name: 'y' } },
      { flavor_text: 'Texto Y', language: { name: 'es' }, version: { name: 'y' } },
    ] })
    try {
      assert.equal(yAlbum.edition, 'Pokémon Y')
      assert.equal(await yAlbum.description(25, 'en'), 'Y text')
      assert.equal(await xAlbum.description(25, 'en'), 'X text')
      assert.equal(await yAlbum.description(25, 'es'), 'Texto Y')
      assert.ok(values.has('poke-chose:cache:y:album-description-v1:en:25'))
      assert.ok(values.has('poke-chose:cache:x:album-description-v1:en:25'))
    } finally { globalThis.fetch = original }
  })
})
