import test from 'node:test'
import assert from 'node:assert/strict'
import { compareRepelSamples, repelResearchRegion } from '../experiments/melonds-live/repel-candidates.mjs'

test('repel research derives a region only when three known BW anchors agree', () => {
  const config = { pokedexAddress: '0x0223d16c', partyAddress: '0x02234974', boxesAddress: '0x0221bf6c' }
  assert.deepEqual(repelResearchRegion(config), { address: 0x0223d66c, length: 0x34 })
  assert.throws(() => repelResearchRegion({ ...config, boxesAddress: '0x0221bf70' }))
  assert.throws(() => repelResearchRegion({}))
  assert.throws(() => repelResearchRegion({ pokedexAddress: 0x02521600, partyAddress: 0x02518e08, boxesAddress: 0x02500400 }))
})

test('repel research reports raw changes and instability without confirming a counter', () => {
  const before = Buffer.alloc(0x34)
  const applied = Buffer.from(before)
  applied[0x31] = 200
  const sample = compareRepelSamples(applied, applied, 0x0223d66c, before)
  assert.equal(sample.stable, true)
  assert.equal(sample.confirmedLive, false)
  assert.deepEqual(sample.changes, [{ address: '0x223d69d', offset: 0x31, before: 0, value: 200 }])
  const walked = Buffer.from(applied)
  walked[0x31] = 199
  assert.equal(compareRepelSamples(applied, walked, 0x0223d66c, applied).stable, false)
  assert.equal(compareRepelSamples(walked, walked, 0x0223d66c, applied).changes[0].value, 199)
  assert.deepEqual(compareRepelSamples(walked, walked, 0x0223d66c).changes, [])
  assert.throws(() => compareRepelSamples(Buffer.alloc(1), walked, 0x0223d66c))
  assert.throws(() => compareRepelSamples(walked, walked, 0x02400000))
})
