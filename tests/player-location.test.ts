import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveBlackMapLocation } from '../src/domain/player-location.ts'
import { zoneSlug } from '../src/domain/black-zones.ts'
import { BLACK_MAP_ZONES } from '../src/domain/black-map-zones.ts'

test('verified Route 6 map resolves to the existing PokéAPI zone', () => {
  const location = resolveBlackMapLocation(331)
  assert.deepEqual(location, { id: 361, name: 'unova-route-6' })
  assert.equal(zoneSlug(location!), 'unova-route-6')
})

test('unresolved and invalid maps are not guessed', () => {
  for (const id of [27, 51, 426, 427, -1, 331.5, NaN, Infinity, 0xffffffff]) {
    assert.equal(resolveBlackMapLocation(id), null)
  }
})

test('observed city and lab maps resolve to zones, grouping the lab with Route 6', () => {
  assert.deepEqual(resolveBlackMapLocation(96), { id: 352, name: 'driftveil-city' })
  assert.deepEqual(resolveBlackMapLocation(332), resolveBlackMapLocation(331))
  assert.equal(zoneSlug(resolveBlackMapLocation(96)!), 'driftveil-city')
})

test('consumers cannot mutate the verified correspondence table', () => {
  const location = resolveBlackMapLocation(331)!
  location.id = 999
  location.name = 'changed'
  assert.deepEqual(resolveBlackMapLocation(331), { id: 361, name: 'unova-route-6' })
})

test('observed Driftveil Pokemon Center groups with its city', () => {
  assert.deepEqual(resolveBlackMapLocation(99), resolveBlackMapLocation(96))
  assert.equal(zoneSlug(resolveBlackMapLocation(99)!), 'driftveil-city')
})

test('ROM-derived maps have unique IDs and resolve to known checklist zones', () => {
  const ids = BLACK_MAP_ZONES.flatMap(([, mapIds]) => [...mapIds])
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.length, 388)
  for (const [locationId, mapIds] of BLACK_MAP_ZONES) {
    for (const mapId of mapIds) {
      const location = resolveBlackMapLocation(mapId)!
      assert.equal(location.id, locationId)
      assert.equal(zoneSlug(location), location.name)
    }
  }
  // These map IDs are independent of the PokéAPI IDs used by the checklist.
  assert.notEqual(resolveBlackMapLocation(361)?.id, 361)
})
