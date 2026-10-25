import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readXSavePokedex } from '../src/games/x/save-pokedex.ts'
import { crc16Ccitt, SavePokedexError } from '../src/games/core/save-pokedex.ts'
import { filterCaptureProgress } from '../src/games/core/encounters.ts'
import { fixtureCrc, refreshXChecksums, xPokedexFixture } from './helpers/x-pokedex-fixture.ts'

const rejects = (bytes: Uint8Array, code: string) => assert.throws(() => readXSavePokedex(bytes), error => error instanceof SavePokedexError && error.code === code)

test('X Pokédex reads all seen genders/shiny regions and only caught/foreign flags count as obtained', () => {
  const bytes = xPokedexFixture({ caught: [1, 8, 9, 649, 650, 721], foreign: [25, 649, 650], seen: [[1, 8], [9, 650], [649], [721]], displayed: [151] })
  const before = Buffer.from(bytes)
  const result = readXSavePokedex(bytes)
  assert.deepEqual([...result.seenSpeciesIds], [1, 8, 9, 649, 650, 721])
  assert.deepEqual([...result.caughtSpeciesIds], [1, 8, 9, 25, 649, 650, 721])
  assert.ok(!result.seenSpeciesIds.has(151))
  assert.deepEqual(bytes, before)
  const foreignOnly = readXSavePokedex(xPokedexFixture({ foreign: [1, 649, 650, 721] }))
  assert.deepEqual([...foreignOnly.caughtSpeciesIds], [1, 649])
  assert.equal(foreignOnly.seenSpeciesIds.size, 0)
})

test('X reader rejects wrong sizes, encrypted/unrecognized format and other save versions', () => {
  for (const size of [0, 0x65600 - 1, 0x65600 + 1, 0x80000, 0x76000]) rejects(new Uint8Array(size), 'size')
  rejects(new Uint8Array(0x65600), 'format')
  for (const game of [0, 21, 25, 26, 27, 30, 255]) rejects(xPokedexFixture({ game }), 'game')
  const bad = xPokedexFixture()
  bad[0x65410] ^= 1
  rejects(bad, 'format')
})

test('checksums cover both consumed blocks, including trainer version, and invalid metadata is rejected', () => {
  assert.equal(crc16Ccitt(new TextEncoder().encode('123456789')), 0x29b1)
  assert.equal(fixtureCrc(new TextEncoder().encode('123456789')), 0x29b1)
  for (const offset of [0x14000, 0x14004, 0x1416f, 0x15008, 0x15068, 0x1564c, 0x1569f, 0x65414 + 17 * 8 + 6, 0x65414 + 20 * 8 + 6]) {
    const bytes = xPokedexFixture()
    bytes[offset] ^= 1
    rejects(bytes, 'integrity')
  }
  for (const block of [17, 20]) for (const delta of [0, 4]) {
    const bytes = xPokedexFixture()
    bytes[0x65414 + block * 8 + delta] ^= 1
    rejects(bytes, 'format')
  }
  const wrongGame = xPokedexFixture()
  wrongGame[0x14004] = 25
  refreshXChecksums(wrongGame)
  rejects(wrongGame, 'game')
})

test('subarray offsets work; unused bit padding and unconsumed party/box contents do not invent captures', () => {
  const bytes = xPokedexFixture({ caught: [1, 721, 722, 768], seen: [[], [], [], [1, 721, 722, 768]] })
  bytes.fill(0xff, 0x14200, 0x1481c)
  bytes.fill(0xff, 0x22600, 0x22600 + 0x34ad0)
  refreshXChecksums(bytes)
  const container = Buffer.concat([Buffer.alloc(13, 0xff), bytes, Buffer.alloc(7, 0xff)])
  const result = readXSavePokedex(container.subarray(13, 13 + bytes.length))
  assert.deepEqual([...result.caughtSpeciesIds], [1, 721])
  assert.deepEqual([...result.seenSpeciesIds], [1, 721])
  assert.equal(readXSavePokedex(xPokedexFixture()).caughtSpeciesIds.size, 0)
})

test('capture filters distinguish seen and caught; no Pokédex leaves every manual encounter visible', () => {
  const pokedex = readXSavePokedex(xPokedexFixture({ caught: [13], seen: [[13, 16]] }))
  const rows = [13, 16, 659].map(speciesId => ({ speciesId, name: `species-${speciesId}`, details: [] }))
  const before = structuredClone(rows)
  assert.deepEqual(filterCaptureProgress(rows, pokedex, 'pending').map(row => row.speciesId), [16, 659])
  assert.deepEqual(filterCaptureProgress(rows, pokedex, 'caught').map(row => row.speciesId), [13])
  assert.deepEqual(filterCaptureProgress(rows, pokedex, 'seen').map(row => row.speciesId), [16])
  for (const filter of ['all', 'caught', 'pending', 'seen'] as const) assert.deepEqual(filterCaptureProgress(rows, null, filter), rows)
  assert.deepEqual(filterCaptureProgress(rows, pokedex, 'all'), rows)
  assert.deepEqual(rows, before)
})
