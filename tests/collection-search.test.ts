import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesCollectionLocation, matchesCollectionTags } from '../src/domain/collection-search.ts'
import type { Pokemon } from '../src/models/pokemon.ts'
import i18n from '../src/i18n/index.ts'
import { typeLabel } from '../src/i18n/types.ts'

const t = i18n.getFixedT('es')
const label = (type: Parameters<typeof typeLabel>[1]) => typeLabel(t, type)
const tags = (pokemon: Pokemon, query: string) => matchesCollectionTags(pokemon, query, label)
const pokemon: Pokemon = { id: 1, name: 'bulbasaur', sprite: null, types: ['grass', 'poison'] }

test('collection location filters separate party and all 24 boxes using zero-based box IDs', () => {
  const party = { location: 'party' as const, box: null }
  assert.equal(matchesCollectionLocation(party, 'all'), true)
  assert.equal(matchesCollectionLocation(party, 'party'), true)
  assert.equal(matchesCollectionLocation(party, 0), false)
  for (let box = 0; box < 24; box++) {
    const stored = { location: 'box' as const, box }
    assert.equal(matchesCollectionLocation(stored, 'all'), true)
    assert.equal(matchesCollectionLocation(stored, 'party'), false)
    assert.equal(matchesCollectionLocation(stored, box), true)
    assert.equal(matchesCollectionLocation(stored, (box + 1) % 24), false)
  }
})

test('box selection combines with existing name and type tags without losing duplicate individuals', () => {
  const collection = [
    { ...pokemon, location: 'box' as const, box: 0 },
    { ...pokemon, location: 'box' as const, box: 0 },
    { ...pokemon, location: 'box' as const, box: 1 },
    { ...pokemon, location: 'party' as const, box: null },
  ]
  const filter = (box: number, query: string) => collection.filter(member => matchesCollectionLocation(member, box) && tags(member, query))
  assert.equal(filter(0, 'bulba planta').length, 2)
  assert.equal(filter(1, 'bulba planta').length, 1)
  assert.equal(filter(0, 'fuego').length, 0)
  assert.equal(filter(23, '').length, 0)
  assert.equal(collection.length, 4)
})

test('collection tags combine partial names, exact IDs and both types with AND', () => {
  assert.equal(tags(pokemon, ''), true)
  assert.equal(tags(pokemon, ' BULBA, #1 planta veneno '), true)
  assert.equal(tags(pokemon, 'grass poison'), true)
  assert.equal(tags(pokemon, 'planta fuego'), false)
  assert.equal(tags(pokemon, '10'), false)
  assert.equal(tags(pokemon, 'pla'), false)
  assert.equal(tags(pokemon, '#'), false)
})

test('collection type tags ignore case and accents, using exact Spanish or English type names', () => {
  const electric: Pokemon = { id: 25, name: 'pikachu', sprite: null, types: ['electric'] }
  assert.equal(tags(electric, 'ELÉCTRICO'), true)
  assert.equal(tags(electric, '#electrico, electric pika'), true)
  assert.equal(tags(electric, 'elect'), false)
  assert.equal(tags(electric, 'agua'), false)
})

test('shared collection search supports Gen VI Fairy and nickname/type intersections', () => {
  const pokemon = { id: 280, name: 'ralts', nickname: 'Mi Estrella', types: ['psychic', 'fairy'] }
  const label = (type: string) => ({ psychic: 'Psíquico', fairy: 'Hada' })[type] ?? type
  assert.equal(matchesCollectionTags(pokemon, 'mi hada psiquico', label), true)
  assert.equal(matchesCollectionTags(pokemon, '#280 fairy', label), true)
  assert.equal(matchesCollectionTags(pokemon, 'ralts fighting', label), false)
})

test('origin generation combines with location and tags and resets pagination bounds', async () => {
  const { collectionBrowserView, matchesCollectionGeneration } = await import('../src/domain/collection-search.ts')
  const collection = [
    { id: 649, name: 'genesect', types: ['bug'], location: 'box' as const, box: 0 },
    { id: 650, name: 'chespin', types: ['grass'], location: 'box' as const, box: 0 },
    { id: 650, name: 'chespin', types: ['grass'], location: 'party' as const },
  ]
  const view = collectionBrowserView(collection, { generation: 6, location: 0, query: 'grass', page: 3, boxCount: 31, typeLabel: type => type })
  assert.deepEqual(view.rows, [collection[1]])
  assert.equal(view.currentPage, 0)
  assert.equal(view.boxCounts[0], 2)
  assert.equal(matchesCollectionGeneration({ id: 10001, speciesId: 1 }, 1), true)
  assert.equal(matchesCollectionGeneration({ id: 0 }, 1), false)
  assert.equal(matchesCollectionGeneration({ id: 650 }, null), true)
})
