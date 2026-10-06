import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveBlackMapLocation } from '../src/domain/player-location.ts'
import { zoneSlug } from '../src/domain/black-zones.ts'

test('verified Route 6 map resolves to the existing PokéAPI zone', () => {
  const location = resolveBlackMapLocation(331)
  assert.deepEqual(location, { id: 361, name: 'unova-route-6' })
  assert.equal(zoneSlug(location!), 'unova-route-6')
})

test('unknown maps and PokéAPI IDs are not interpreted as internal maps', () => {
  for (const id of [0, 330, 332, 361, -1, 331.5, NaN, Infinity, 0xffffffff]) {
    assert.equal(resolveBlackMapLocation(id), null)
  }
})

test('consumers cannot mutate the verified correspondence table', () => {
  const location = resolveBlackMapLocation(331)!
  location.id = 999
  location.name = 'changed'
  assert.deepEqual(resolveBlackMapLocation(331), { id: 361, name: 'unova-route-6' })
})
