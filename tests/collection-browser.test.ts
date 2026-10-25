import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectionBrowserView } from '../src/domain/collection-search.ts'
import { xCollectionMoves } from '../src/games/x/collection-service.ts'
import { blackCollectionMoves } from '../src/games/black/collection-service.ts'
import { matchesFieldMove } from '../src/domain/field-moves.ts'

const options = { query: '', location: 'all' as const, page: 0, boxCount: 31, typeLabel: (type: string) => ({ fairy: 'Hada', psychic: 'Psíquico' })[type] ?? type }
const collection = [
  { id: 280, name: 'ralts', nickname: 'Ámbar', types: ['psychic', 'fairy'], location: 'party' as const, box: null, slot: 0 },
  { id: 280, name: 'ralts', nickname: 'Otra', types: ['psychic', 'fairy'], location: 'box' as const, box: 30, slot: 29 },
  { id: 447, name: 'riolu', types: ['fighting'], location: 'box' as const, box: 0, slot: 2 },
]

test('shared collection browsing composes location, localized tags and adapter predicates without merging individuals', () => {
  const view = collectionBrowserView(collection, { ...options, query: 'ambar hada psíquico #280' })
  assert.deepEqual(view.rows, [collection[0]])
  assert.equal(collectionBrowserView(collection, { ...options, query: 'fairy' }).rows.length, 2)
  assert.equal(collectionBrowserView(collection, { ...options, location: 30 }).rows[0], collection[1])
  assert.deepEqual(view.boxCounts.slice(-1), [1])
  assert.equal(view.partyCount, 1)
  assert.equal(collectionBrowserView(collection, { ...options, accepts: p => p.id === 447 }).rows[0], collection[2])
  assert.deepEqual(collection.map(p => p.slot), [0, 29, 2])
})

test('shared pagination clamps after a new reading and distinguishes empty collection, location and search', () => {
  const rows = Array.from({ length: 25 }, (_, id) => ({ id: id + 1, name: `species-${id}`, types: ['normal'], location: 'box' as const, box: 0 }))
  const last = collectionBrowserView(rows, { ...options, page: 99 })
  assert.equal(last.currentPage, 2)
  assert.equal(last.visibleRows.length, 1)
  assert.equal(collectionBrowserView(rows.slice(0, 2), { ...options, page: last.currentPage }).currentPage, 0)
  assert.equal(collectionBrowserView([], options).empty, 'collection')
  assert.equal(collectionBrowserView(rows, { ...options, location: 'party' }).empty, 'party')
  assert.equal(collectionBrowserView(rows, { ...options, location: 1 }).empty, 'box')
  assert.equal(collectionBrowserView(rows, { ...options, query: 'not-found' }).empty, 'matches')
  assert.equal(collectionBrowserView(rows, { ...options, page: -1 }).currentPage, 0)
})

test('collection adapters expose their own machine compatibility and keep eggs and combined filters consistent', async () => {
  assert.ok(blackCollectionMoves.moves.includes('dive'))
  assert.equal(blackCollectionMoves.moves.includes('rock-smash'), false)
  assert.ok(xCollectionMoves.moves.includes('rock-smash'))
  assert.equal(xCollectionMoves.moves.includes('dive'), false)
  const lapras = await xCollectionMoves.load(xCollectionMoves.resource({ id: 131 }))
  assert.ok(lapras.includes('surf'))
  assert.ok(lapras.includes('waterfall'))
  assert.equal(matchesFieldMove({ id: 131 }, ['surf', 'waterfall'], lapras), true)
  assert.equal(matchesFieldMove({ id: 131, isEgg: true }, ['surf'], lapras), false)
  assert.equal(matchesFieldMove({ id: 131 }, ['surf', 'fly'], lapras), false)
  assert.notEqual(xCollectionMoves.resource({ id: 492, form: 0 }), xCollectionMoves.resource({ id: 492, form: 1 }))
  await assert.rejects(xCollectionMoves.load('invalid'))
  await assert.rejects(xCollectionMoves.load('999:0'))
})
