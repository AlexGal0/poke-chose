import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addToCollection, removeFromCollection, toggleTeamMember } from '../src/domain/collection.ts'
import { decodeState, loadState, saveState } from '../src/storage/local.ts'
import type { CollectionState, Pokemon } from '../src/models/pokemon.ts'

const collection: Pokemon[] = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `pokemon-${i}`, types: ['normal'], sprite: null }))
test('collection prevents duplicates and removal also removes team member', () => {
  const initial = { collection: [], teamIds: [] }
  const added = addToCollection(initial, collection[0])
  assert.equal(addToCollection(added, collection[0]).collection.length, 1)
  assert.deepEqual(removeFromCollection(toggleTeamMember(added, 1), 1), initial)
  assert.deepEqual(initial, { collection: [], teamIds: [] })
})
test('team caps at six, only allows collection members and permits replacements', () => {
  let state: CollectionState = { collection, teamIds: [] }
  for (const pokemon of collection) state = toggleTeamMember(state, pokemon.id)
  assert.deepEqual(state.teamIds, [1, 2, 3, 4, 5, 6])
  state = toggleTeamMember(state, 1)
  state = toggleTeamMember(state, 7)
  assert.deepEqual(state.teamIds, [2, 3, 4, 5, 6, 7])
  assert.deepEqual(toggleTeamMember({ collection, teamIds: [] }, 500).teamIds, [])
})
test('storage round-trip and cleanup of corrupt, duplicate and dangling values', () => {
  const state = { collection, teamIds: [1, 2, 3] }
  assert.deepEqual(decodeState(JSON.stringify(state)), state)
  assert.deepEqual(decodeState('{broken'), { collection: [], teamIds: [] })
  assert.deepEqual(decodeState(null), { collection: [], teamIds: [] })
  const dirty = { collection: [...collection, collection[0], { ...collection[0], id: 700 }, { ...collection[0], types: ['fairy'] }], teamIds: [1, 1, 900, 2, 3, 4, 5, 6, 7] }
  assert.deepEqual(decodeState(JSON.stringify(dirty)), { collection, teamIds: [1, 2, 3, 4, 5, 6] })
})
test('localStorage saves and restores; unavailable storage fails safely', () => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } })
  const state = { collection, teamIds: [1] }
  assert.equal(saveState(state), true)
  assert.deepEqual(loadState(), state)
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked') } })
  assert.equal(saveState(state), false)
  assert.deepEqual(loadState(), { collection: [], teamIds: [] })
  Reflect.deleteProperty(globalThis, 'localStorage')
})
