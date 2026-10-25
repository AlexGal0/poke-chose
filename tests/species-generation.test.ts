import { test } from 'node:test'
import assert from 'node:assert/strict'
import { speciesGeneration } from '../src/domain/species-generation.ts'

test('origin generations follow National Dex boundaries, independently of the selected game', () => {
  const ends = [151, 251, 386, 493, 649, 721, 809, 905, 1025]
  for (const [index, last] of ends.entries()) {
    assert.equal(speciesGeneration(last), index + 1)
    assert.equal(speciesGeneration(index === 0 ? 1 : ends[index - 1] + 1), index + 1)
  }
  assert.equal(speciesGeneration(280), 3)
  assert.equal(speciesGeneration(447), 4)
  assert.equal(speciesGeneration(653), 6)
  for (const invalid of [0, -1, 1.5, NaN, Infinity, 1026]) assert.equal(speciesGeneration(invalid), null)
})
