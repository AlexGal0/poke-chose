import test from 'node:test'
import assert from 'node:assert/strict'
import { blackWhitePokedexScope } from '../src/domain/pokedex-scope.ts'

test('Black/White regional scope includes Victini through Genesect, excluding previous generations and invalid IDs', () => {
  for (const id of [1, 25, 493]) assert.equal(blackWhitePokedexScope(id), 'national')
  for (const id of [494, 495, 506, 649]) assert.equal(blackWhitePokedexScope(id), 'unova')
  for (const id of [0, -1, 650, 1.5, NaN]) assert.equal(blackWhitePokedexScope(id), null)
})
