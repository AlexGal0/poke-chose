import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readXMemoryPokedex, X_MEMORY_POKEDEX_ADDRESS } from '../src/games/x/memory-pokedex.ts'
import { xPokedexFixture } from './helpers/x-pokedex-fixture.ts'
import { readXSavePokedex } from '../src/games/x/save-pokedex.ts'
import { discoveredSpecies } from '../src/domain/discovery.ts'

function block() {
  const save = xPokedexFixture({ caught: [25, 721], foreign: [649, 650], seen: [[1], [8], [650], [721]], displayed: [151] })
  const bytes = Buffer.from(save.subarray(0x15000, 0x156a0))
  bytes.set([0x17, 0x0f, 0x12, 0x2f, 0, 0, 0, 0])
  return { save, bytes }
}
test('X memory Pokédex shares save flag semantics without deriving captures from seen/displayed flags', async () => {
  const { save, bytes } = block()
  const before = Buffer.from(bytes)
  let calls = 0
  const result = await readXMemoryPokedex({ async read(address, size) {
    assert.equal(address, X_MEMORY_POKEDEX_ADDRESS)
    assert.equal(size, 0x6a0)
    calls++
    return bytes
  } })
  assert.equal(calls, 2)
  assert.deepEqual(result, readXSavePokedex(save))
  assert.equal(result.caughtSpeciesIds.has(1), false)
  assert.equal(result.caughtSpeciesIds.has(650), false)
  assert.equal(discoveredSpecies(result).has(1), true)
  assert.equal(discoveredSpecies(result).has(151), false)
  assert.deepEqual(bytes, before)
})
test('X memory Pokédex rejects changing, truncated, unmapped and wrong-header reads', async () => {
  for (const kind of ['changed', 'short', 'zero', 'header']) {
    const { bytes } = block()
    let calls = 0
    await assert.rejects(readXMemoryPokedex({ async read() {
      calls++
      if (kind === 'short') return bytes.subarray(0, 20)
      if (kind === 'zero') return Buffer.alloc(0x6a0)
      if (kind === 'header') bytes[0] = 0
      if (kind === 'changed' && calls === 2) bytes[8] ^= 1
      return bytes
    } }))
  }
})



test('X Pokédex allows mutable upgrade and initial-species header flags without changing capture semantics', async () => {
  const { save, bytes } = block()
  bytes.set([0xc0, 0x7f, 0, 0], 4)
  assert.deepEqual(await readXMemoryPokedex({ async read() { return bytes } }), readXSavePokedex(save))
  let calls = 0
  await assert.rejects(readXMemoryPokedex({ async read() {
    calls++
    if (calls === 2) bytes[4] ^= 1
    return bytes
  } }))
})
