import test from 'node:test'
import assert from 'node:assert/strict'
import { nextFollowedZone } from '../src/domain/followed-zone.ts'

test('unknown or stale samples preserve the last recognized zone in the same source', () => {
  let state = nextFollowedZone({ source: 'live', id: null }, 'live', true, 361)
  assert.equal(state.id, 361)
  state = nextFollowedZone(state, 'live', true, null)
  assert.equal(state.id, 361)
  assert.equal(nextFollowedZone(state, 'live', true, 352).id, 352)
})

test('switching source cannot carry a previous source location', () => {
  const state = { source: 'live' as const, id: 352 }
  assert.deepEqual(nextFollowedZone(state, 'save', true, null), { source: 'save', id: null })
  assert.deepEqual(nextFollowedZone(state, 'save', true, 361), { source: 'save', id: 361 })
  assert.deepEqual(nextFollowedZone(state, 'manual', true, 361), { source: 'manual', id: null })
})

test('manual pause clears the old followed zone before re-enabling on an unknown map', () => {
  const paused = nextFollowedZone({ source: 'live', id: 352 }, 'live', false, 361)
  assert.equal(paused.id, null)
  assert.equal(nextFollowedZone(paused, 'live', true, null).id, null)
  assert.equal(nextFollowedZone(paused, 'live', true, 361).id, 361)
})
