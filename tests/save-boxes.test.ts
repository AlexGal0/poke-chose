import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crc16, decryptPk5, parseSave, parseStoredPk5 } from '../bridge/parser.ts'
import { boxesEqual, isSaveSnapshot } from '../src/models/party.ts'
import { pk5Fixture, refreshFixtureChecksums, saveFixture } from './helpers/save-fixture.ts'

function place(save: Buffer, box: number, slot: number, speciesId: number, base = 0) {
  pk5Fixture(speciesId).subarray(0, 136).copy(save, base + 0x400 + box * 0x1000 + slot * 136)
  refreshFixtureChecksums(save, base)
}

test('stored PK5 decrypts 136 bytes for all shuffles without reading party stats or mutating bytes', () => {
  for (let shuffle = 0; shuffle < 32; shuffle++) {
    const stored = pk5Fixture(572, 0, shuffle).subarray(0, 136)
    const original = Buffer.from(stored)
    const pokemon = parseStoredPk5(stored)!
    assert.equal(pokemon.speciesId, 572)
    assert.equal(pokemon.heldItemId, 234)
    assert.equal(pokemon.abilityId, 65)
    assert.deepEqual(pokemon.moveIds, [33, 45, 55, 0])
    assert.equal('level' in pokemon, false)
    assert.equal(decryptPk5(stored).length, 136)
    assert.deepEqual(stored, original)
  }
})

test('empty slots, encrypted cleared slots and fully empty boxes are skipped', () => {
  assert.equal(parseStoredPk5(Buffer.alloc(136)), null)
  assert.equal(parseStoredPk5(pk5Fixture(0).subarray(0, 136)), null)
  assert.deepEqual(parseSave(saveFixture([])).boxes, [])
  assert.throws(() => parseStoredPk5(Buffer.alloc(135)), /136/)
  assert.throws(() => parseStoredPk5(Buffer.alloc(136, 255)))
})

test('first and last slot of all 24 boxes, padding stride and duplicate specimens are preserved', () => {
  const save = saveFixture([pk5Fixture(572)])
  place(save, 0, 0, 572)
  place(save, 0, 29, 573)
  place(save, 1, 0, 572)
  place(save, 23, 29, 649)
  const parsed = parseSave(save)
  assert.deepEqual(parsed.boxes.map(pokemon => [pokemon.box, pokemon.slot, pokemon.speciesId]), [[0, 0, 572], [0, 29, 573], [1, 0, 572], [23, 29, 649]])
  assert.equal(parsed.party.length + parsed.boxes.length, 5)
  assert.equal(parsed.pokedex.caughtSpeciesIds.size, 0) // physical collection never populates dex flags
})

test('every box CRC/local mirror and each occupied PK5 checksum are validated', () => {
  for (const box of [0, 1, 23]) {
    const save = saveFixture()
    save[0x400 + box * 0x1000] ^= 1
    assert.throws(() => parseSave(save, false), /checksum/)
    const mirror = saveFixture()
    mirror[0x23f02 + box * 2] ^= 1
    mirror.writeUInt16LE(crc16(mirror.subarray(0x23f00, 0x23f8c)), 0x23f9a)
    assert.throws(() => parseSave(mirror, false), /checksum/)
    const local = saveFixture()
    local[0x400 + box * 0x1000 + 0xff2] ^= 1
    assert.throws(() => parseSave(local, false), /checksum/)
  }
  const badPokemon = saveFixture()
  place(badPokemon, 0, 0, 572)
  badPokemon[0x400 + 16] ^= 1
  refreshFixtureChecksums(badPokemon)
  assert.throws(() => parseSave(badPokemon, false), /Checksum PK5/)
  const invalid = saveFixture()
  place(invalid, 0, 0, 650)
  assert.throws(() => parseSave(invalid, false), /Especie/)
})

test('box failure uses a coherent validated backup only when allowed', () => {
  const save = saveFixture([], [])
  place(save, 0, 0, 572)
  place(save, 23, 29, 573, 0x24000)
  save[0x13f2] ^= 1
  const result = parseSave(save)
  assert.equal(result.backup, true)
  assert.deepEqual(result.boxes.map(pokemon => pokemon.speciesId), [573])
  assert.throws(() => parseSave(save, false))
})

test('box equality detects moves between slots/boxes, additions, release, form and metadata', () => {
  const save = saveFixture()
  place(save, 0, 0, 572)
  const boxes = parseSave(save).boxes
  assert.equal(boxesEqual(boxes, structuredClone(boxes)), true)
  assert.equal(boxesEqual(null, []), false)
  assert.equal(boxesEqual([], []), true)
  assert.equal(boxesEqual(boxes, []), false)
  for (const key of ['box', 'slot', 'personality', 'trainerId', 'speciesId', 'form', 'heldItemId', 'abilityId'] as const) {
    assert.equal(boxesEqual(boxes, [{ ...boxes[0], [key]: boxes[0][key] + 1 }]), false)
  }
  assert.equal(boxesEqual(boxes, [{ ...boxes[0], isEgg: true }]), false)
  assert.equal(boxesEqual(boxes, [{ ...boxes[0], moveIds: [0, 0, 0, 0] }]), false)
})

test('SSE validation rejects invalid box bounds, duplicate physical slots and malformed records', () => {
  const save = saveFixture()
  place(save, 23, 29, 572)
  const parsed = parseSave(save)
  const snapshot = { status: 'ready', message: 'ready', party: parsed.party, boxes: parsed.boxes, pokedex: null, updatedAt: null, backup: false }
  assert.equal(isSaveSnapshot(snapshot), true)
  assert.equal(isSaveSnapshot({ ...snapshot, boxes: undefined }), false)
  assert.equal(isSaveSnapshot({ ...snapshot, boxes: [parsed.boxes[0], parsed.boxes[0]] }), false)
  for (const invalid of [{ box: 24 }, { box: -1 }, { slot: 30 }, { slot: -1 }, { speciesId: 650 }, { moveIds: [] }]) {
    assert.equal(isSaveSnapshot({ ...snapshot, boxes: [{ ...parsed.boxes[0], ...invalid }] }), false)
  }
  assert.equal(isSaveSnapshot({ ...snapshot, boxes: [null] }), false)
})
