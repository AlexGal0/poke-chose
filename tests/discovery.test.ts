import { test } from 'node:test'
import assert from 'node:assert/strict'
import { discoveredSpecies } from '../src/domain/discovery.ts'

test('seen and caught independently reveal a species; absent and unknown dex reveal none', () => {
  assert.equal(discoveredSpecies(null).size, 0)
  const dex = { seenSpeciesIds: new Set([495]), caughtSpeciesIds: new Set([496]) }
  const discovered = discoveredSpecies(dex)
  assert.equal(discovered.has(495), true)
  assert.equal(discovered.has(496), true)
  assert.equal(discovered.has(497), false)
  assert.deepEqual([...dex.seenSpeciesIds], [495])
  assert.deepEqual([...dex.caughtSpeciesIds], [496])
  dex.seenSpeciesIds.add(497)
  assert.equal(discoveredSpecies(dex).has(497), true)
})
