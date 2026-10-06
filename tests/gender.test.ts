import { test } from 'node:test'
import assert from 'node:assert/strict'
import { speciesGender } from '../src/domain/gender.ts'
import { getSpeciesGender } from '../src/api/gender.ts'

test('species rates distinguish both sexes, single-sex species and genderless without guessing', () => {
  assert.equal(speciesGender(-1)?.kind, 'genderless')
  assert.equal(speciesGender(0)?.kind, 'male')
  assert.equal(speciesGender(8)?.kind, 'female')
  for (const rate of [1, 2, 4, 6, 7]) assert.equal(speciesGender(rate)?.kind, 'both')
  for (const rate of [undefined, null, -2, 9, 2.5, '4', NaN]) assert.equal(speciesGender(rate), null)
})
test('concurrent gender lookups share a request and surface fetch failures for retry', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ gender_rate: 8 })) }
  try {
    const result = await Promise.all([getSpeciesGender(413), getSpeciesGender(413)])
    assert.equal(result[0]?.kind, 'female')
    assert.equal(result[1]?.kind, 'female')
    assert.equal(calls, 1)
    globalThis.fetch = async () => new Response('', { status: 503 })
    await assert.rejects(getSpeciesGender(494), /PokéAPI/)
    globalThis.fetch = async () => new Response(JSON.stringify({ gender_rate: -1 }))
    assert.equal((await getSpeciesGender(494))?.kind, 'genderless')
  } finally { globalThis.fetch = original }
})
