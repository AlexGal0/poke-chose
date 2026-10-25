import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { adaptSpecies, createCatalogService } from '../src/games/core/catalog.ts'
import type { CatalogRules, SpeciesResponse } from '../src/games/core/catalog.ts'
import { decodeManualCollection, createManualStorage } from '../src/games/core/manual-storage.ts'
import { xCatalogRules } from '../src/games/x/catalog.ts'
import { addToCollection, removeFromCollection, toggleTeamMember } from '../src/domain/collection.ts'

const slots = (...types: string[]) => types.map((name, index) => ({ slot: index + 1, type: { name } }))
const fixture = (types: string[]): SpeciesResponse => ({
  id: 700, name: 'sylveon', types: slots(...types), past_types: [],
  sprites: { versions: { 'generation-vi': { 'x-y': { front_default: null } } } },
})
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
  else Reflect.deleteProperty(globalThis, 'localStorage')
})
function memoryStorage() {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } })
  return values
}

test('X keeps Fairy, ignores pre-Gen VI types and selects earliest covering history', () => {
  const data = fixture(['fairy'])
  data.past_types = [{ generation: { name: 'generation-v' }, types: slots('normal') }]
  assert.deepEqual(adaptSpecies(data, { id: 700, name: 'sylveon' }, xCatalogRules).types, ['fairy'])
  data.past_types.push({ generation: { name: 'generation-viii' }, types: slots('normal', 'fairy') })
  data.past_types.push({ generation: { name: 'generation-vi' }, types: slots('fairy') })
  assert.deepEqual(adaptSpecies(data, { id: 700, name: 'sylveon' }, xCatalogRules).types, ['fairy'])
  assert.throws(() => adaptSpecies(data, { id: 722, name: 'rowlet' }, xCatalogRules))
  assert.throws(() => adaptSpecies(fixture(['stellar']), { id: 700, name: 'sylveon' }, xCatalogRules))
})

test('catalog resolves default varieties instead of assuming species equals Pokémon id; caches by game', async () => {
  memoryStorage()
  const calls: string[] = []
  const fetcher = (async (url: string | URL | Request) => {
    const path = String(url)
    calls.push(path)
    return Response.json(path.includes('pokemon-species/')
      ? { varieties: [{ is_default: false, pokemon: { name: 'wrong-form' } }, { is_default: true, pokemon: { name: 'meowstic-male' } }] }
      : { ...fixture(['psychic']), id: 10000, name: 'meowstic-male' })
  }) as typeof fetch
  const service = createCatalogService(xCatalogRules, fetcher)
  const entry = { id: 678, name: 'meowstic' }
  assert.equal((await service.get(entry)).id, 678)
  assert.equal((await service.get(entry)).name, 'meowstic')
  assert.equal(calls.length, 2)
  assert.ok(calls[1].endsWith('/pokemon/meowstic-male'))
  await createCatalogService({ ...xCatalogRules, id: 'other-game' }, fetcher).get(entry)
  assert.equal(calls.length, 4)
})

test('storage isolates games, removes corruption and dangling team entries, preserves six-member rules', () => {
  const values = memoryStorage()
  values.set('poke-chose:bw:v1', 'black-data-untouched')
  const pokemon = adaptSpecies(fixture(['fairy']), { id: 700, name: 'sylveon' }, xCatalogRules)
  const collection = Array.from({ length: 7 }, (_, index) => ({ ...pokemon, id: 650 + index }))
  const decoded = decodeManualCollection(JSON.stringify({ collection: [...collection, collection[0], { ...pokemon, id: 999 }], teamIds: [999, 650, 650, 651, 652, 653, 654, 655, 656] }), xCatalogRules)
  assert.equal(decoded.collection.length, 7)
  assert.deepEqual(decoded.teamIds, [650, 651, 652, 653, 654, 655])
  assert.deepEqual(toggleTeamMember(decoded, 656), decoded)
  assert.equal(removeFromCollection(decoded, 650).teamIds.includes(650), false)
  assert.equal(addToCollection(decoded, collection[0]).collection.length, 7)
  assert.equal(createManualStorage(xCatalogRules).save(decoded), true)
  assert.deepEqual(createManualStorage(xCatalogRules).load(), decoded)
  assert.deepEqual(createManualStorage({ ...xCatalogRules, id: 'other' }).load().collection, [])
  assert.equal(values.get('poke-chose:bw:v1'), 'black-data-untouched')
  assert.deepEqual(decodeManualCollection('{broken', xCatalogRules).teamIds, [])
})

test('catalog rejects incomplete cached lists and propagates failures without poisoning retry', async () => {
  const values = memoryStorage()
  const rules: CatalogRules = { ...xCatalogRules, maxSpecies: 2 }
  values.set('poke-chose:cache:x:catalog-v1:index', JSON.stringify([{ id: 1, name: 'bulbasaur' }, { id: 1, name: 'duplicate' }]))
  let fail = true
  const service = createCatalogService(rules, (async () => {
    if (fail) return new Response('', { status: 503 })
    return Response.json({ results: [{ name: 'bulbasaur', url: '/pokemon-species/1/' }, { name: 'ivysaur', url: '/pokemon-species/2/' }] })
  }) as typeof fetch)
  await assert.rejects(service.list())
  fail = false
  assert.deepEqual((await service.list()).map(row => row.id), [1, 2])
})

test('unavailable browser storage still permits session use and reports failed persistence', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('disabled') } })
  const storage = createManualStorage(xCatalogRules)
  assert.deepEqual(storage.load(), { collection: [], teamIds: [] })
  assert.equal(storage.save({ collection: [], teamIds: [] }), false)
})
