import test from 'node:test'
import assert from 'node:assert/strict'
import { blackEvolutionInventory, blackEvolutionRequirements } from '../src/games/black/evolution-requirements.ts'

test('Black requirements preserve regional scopes at the adapter boundary', () => {
  const service = blackEvolutionRequirements
  assert.equal(service.defaultScope, 'unova')
  assert.equal(service.inScope(511, 'unova'), true)
  assert.equal(service.inScope(133, 'unova'), false)
  assert.equal(service.inScope(133, 'national'), true)
  assert.equal(service.inScope(511, 'all'), true)
})

test('inventory normalization distinguishes unknown, empty, bag and held-only items', () => {
  assert.equal(blackEvolutionInventory(null, { 82: 1 }), null)
  assert.deepEqual(blackEvolutionInventory([], {}), {})
  assert.deepEqual(blackEvolutionInventory([{ gameIndex: 82, count: 2 }], { 82: 1, 83: 3 }), {
    82: { bag: 2, held: 1 }, 83: { bag: 0, held: 3 },
  })
})
