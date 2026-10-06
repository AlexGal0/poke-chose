import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePokedexBlock } from '../bridge/pokedex.ts'
import { parseSave } from '../bridge/parser.ts'
import { deserializePokedex, isPokedexSnapshot, pokedexEqual, serializePokedex } from '../src/models/pokedex.ts'
import { captureChecklist } from '../src/domain/checklist.ts'
import { saveFixture, pk5Fixture, refreshFixtureChecksums } from './helpers/save-fixture.ts'

// Original small, synthetic BW dex blocks. No data from the user's save in fixtures.
function dexBlock(seen: number[] = [], caught: number[] = [], region = 0) {
  const block = Buffer.alloc(0x4d4)
  for (const [ids, offset] of [[seen, 0x5c + region * 0x54], [caught, 0x08]] as const) {
    for (const id of ids) block[offset + Math.floor((id - 1) / 8)] |= 2 ** ((id - 1) % 8)
  }
  return block
}

test('never seen species is neither seen nor caught', () => {
  const dex = parsePokedexBlock(dexBlock())
  assert.equal(dex.seenSpeciesIds.has(498), false)
  assert.equal(dex.caughtSpeciesIds.has(498), false)
})
test('seen only is never marked caught, across all four gender/shiny regions', () => {
  for (let region = 0; region < 4; region++) {
    const dex = parsePokedexBlock(dexBlock([577], [], region))
    assert.equal(dex.seenSpeciesIds.has(577), true)
    assert.equal(dex.caughtSpeciesIds.has(577), false)
  }
})
test('captured species has independent caught and seen flags', () => {
  const dex = parsePokedexBlock(dexBlock([498], [498]))
  assert.equal(dex.seenSpeciesIds.has(498), true)
  assert.equal(dex.caughtSpeciesIds.has(498), true)
  assert.equal(parsePokedexBlock(dexBlock([], [498])).caughtSpeciesIds.has(498), true)
})
test('multiple caught species and low/high bitset boundaries use speciesId - 1', () => {
  const ids = [1, 8, 9, 498, 572, 573, 648, 649]
  const block = dexBlock(ids, ids)
  block[0x08 + 81] |= 0xfe // unused species bits 650–656 must never leak into output
  const dex = parsePokedexBlock(block)
  assert.deepEqual([...dex.caughtSpeciesIds], ids)
  assert.deepEqual([...dex.seenSpeciesIds], ids)
  assert.equal(dex.caughtSpeciesIds.has(0), false)
  assert.equal(dex.caughtSpeciesIds.has(650), false)
  assert.equal(dex.caughtSpeciesIds.has(497), false)
  assert.throws(() => parsePokedexBlock(Buffer.alloc(100)))
})
test('capture flags survive evolution/removal from party and arbitrary contents of boxes/daycare', () => {
  const evolved = saveFixture([pk5Fixture(573)])
  dexBlock([572, 573, 577], [572, 573]).copy(evolved, 0x21600)
  refreshFixtureChecksums(evolved)
  const absent = saveFixture([])
  dexBlock([572, 573, 577], [572, 573]).copy(absent, 0x21600)
  pk5Fixture(502).subarray(0, 136).copy(absent, 0x400) // unrelated Pokémon in PC, not a caught flag source
  absent.fill(255, 0x20e00, 0x20fcc) // irrelevant Day Care bytes
  refreshFixtureChecksums(absent)
  for (const save of [evolved, absent]) {
    const dex = parseSave(save).pokedex
    assert.equal(dex.caughtSpeciesIds.has(572), true)
    assert.equal(dex.caughtSpeciesIds.has(573), true)
    assert.equal(dex.caughtSpeciesIds.has(577), false)
    const checklist = captureChecklist([572, 573, 577].map(speciesId => ({ speciesId, name: String(speciesId), details: [] })), dex.caughtSpeciesIds)
    assert.deepEqual(checklist.rows.map(row => row.caught), [true, true, false])
    assert.equal(checklist.caught, 2)
    assert.equal(checklist.total, 3)
  }
})
test('dex CRC, mirror and Black version are mandatory; primary and backup use same validated layout', () => {
  const save = saveFixture([], [])
  dexBlock([498], [498]).copy(save, 0x21600)
  dexBlock([499], [499]).copy(save, 0x24000 + 0x21600)
  refreshFixtureChecksums(save)
  refreshFixtureChecksums(save, 0x24000)
  assert.equal(parseSave(save).pokedex.caughtSpeciesIds.has(498), true)
  save[0x21608] ^= 1
  assert.throws(() => parseSave(save, false), /checksum/)
  assert.equal(parseSave(save).pokedex.caughtSpeciesIds.has(499), true)
  const white = saveFixture()
  white[0x1941f] = 20
  refreshFixtureChecksums(white)
  assert.throws(() => parseSave(white), /no White/)
})
test('dex JSON transport round-trips sets; equality ignores insertion order and detects seen/caught-only changes', () => {
  const dex = parsePokedexBlock(dexBlock([498, 499, 577], [498, 499]))
  const snapshot = serializePokedex(dex)
  assert.deepEqual(deserializePokedex(JSON.parse(JSON.stringify(snapshot))), dex)
  assert.equal(isPokedexSnapshot(snapshot), true)
  assert.equal(isPokedexSnapshot({ seenSpeciesIds: [], caughtSpeciesIds: [0, 650] }), false)
  assert.equal(pokedexEqual(snapshot, { seenSpeciesIds: [577, 499, 498], caughtSpeciesIds: [499, 498] }), true)
  assert.equal(pokedexEqual(snapshot, { ...snapshot, caughtSpeciesIds: [498, 499, 577] }), false)
  assert.equal(pokedexEqual(snapshot, { ...snapshot, seenSpeciesIds: [498, 499] }), false)
})
