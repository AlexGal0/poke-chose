import test from 'node:test'
import assert from 'node:assert/strict'
import { readPk6 } from '../src/games/x/pk6.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'
import { eggHatching, eggHatchingProgress } from '../src/domain/egg-hatching.ts'
import { xSavedPokemon } from '../src/games/x/saved-roster.ts'
import { isSavedPokemon } from '../src/sources/saved-pokemon-validation.ts'

test('PK6 exposes remaining egg cycles from OT field regardless of handler; adults expose no counter', () => {
  for (const handler of [0, 1]) for (const cycles of [0, 1, 20, 255]) {
    assert.equal(readPk6(fixturePk6({ egg: true, hatchCycles: cycles, handler }))?.hatchCyclesRemaining, cycles)
  }
  assert.equal(readPk6(fixturePk6())?.hatchCyclesRemaining, undefined)
})

test('egg hatching uses explicit cycle lengths and ranges rather than inventing exact steps', () => {
  assert.deepEqual(eggHatching(25, 257), { cycles: 25, steps: { min: 6169, max: 6425 } })
  assert.deepEqual(eggHatching(1, 257)?.steps, { min: 1, max: 257 })
  assert.deepEqual(eggHatching(0, 257), { cycles: 0, steps: null })
  assert.equal(eggHatching(20, undefined)?.steps, null)
  assert.equal(eggHatching(2, 128)?.steps?.max, 256)
  for (const invalid of [undefined, -1, 256, 1.5, NaN]) assert.equal(eggHatching(invalid, 257), null)
})

test('source validator accepts old eggs and byte counters, rejects adult/invalid counters', () => {
  const limits = { maxSpecies: 721, boxCount: 31, nicknameLength: 12 }
  const egg = readPk6(fixturePk6({ egg: true }))!
  assert.ok(isSavedPokemon(egg, limits))
  assert.ok(isSavedPokemon({ ...egg, hatchCyclesRemaining: undefined }, limits))
  for (const hatchCyclesRemaining of [-1, 256, 1.2, null]) assert.equal(isSavedPokemon({ ...egg, hatchCyclesRemaining }, limits), false)
  assert.equal(isSavedPokemon({ ...egg, isEgg: false }, limits), false)
})

test('hatching bar fills from species baseline and does not invent a baseline for unusual eggs', async () => {
  const eevee = await xSavedPokemon({ speciesId: 133, form: 0 })
  assert.equal(eevee.hatchCycles, 35)
  assert.deepEqual(eggHatchingProgress(35, 35), { value: 0, max: 35, percent: 0 })
  assert.deepEqual(eggHatchingProgress(14, eevee.hatchCycles), { value: 21, max: 35, percent: 60 })
  assert.deepEqual(eggHatchingProgress(0, 35), { value: 35, max: 35, percent: 100 })
  for (const [remaining, initial] of [[undefined, 35], [14, undefined], [14, 0], [36, 35], [-1, 35], [1.5, 35]]) assert.equal(eggHatchingProgress(remaining, initial), null)
})
