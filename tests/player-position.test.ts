import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePlayerPositionBlock } from '../bridge/player-position.ts'
import { crc16, parseSave } from '../bridge/parser.ts'
import { refreshFixtureChecksums, saveFixture, pk5Fixture } from './helpers/save-fixture.ts'

function writePosition(save: Buffer, base = 0, mapId = 123) {
  save.writeUInt32LE(mapId, base + 0x19580)
  save.writeUInt16LE(17, base + 0x19586)
  save.writeUInt16LE(29, base + 0x1958a)
  save.writeUInt16LE(41, base + 0x1958e)
  refreshFixtureChecksums(save, base)
}

test('reads internal map and distinct coordinates without modifying the save', () => {
  const save = saveFixture()
  writePosition(save, 0, 0x12345678)
  const original = Buffer.from(save)
  assert.deepEqual(parseSave(save).position, { mapId: 0x12345678, x: 17, y: 41, z: 29 })
  assert.deepEqual(save, original)
})

test('position parser respects sliced byte offsets and rejects incomplete blocks', () => {
  const bytes = Buffer.alloc(0xa0)
  bytes.writeUInt32LE(456, 4 + 0x80)
  assert.equal(parsePlayerPositionBlock(bytes.subarray(4)).mapId, 456)
  assert.throws(() => parsePlayerPositionBlock(bytes.subarray(5)), /incompleto/)
})

test('invalid position data or local CRC preserves valid core data without using backup', () => {
  for (const offset of [0x19580, 0x1959e]) {
    const save = saveFixture([pk5Fixture(496)], [pk5Fixture(502)])
    writePosition(save)
    writePosition(save, 0x24000, 999)
    save[offset] ^= 1
    const result = parseSave(save)
    assert.equal(result.position, null)
    assert.equal(result.backup, false)
    assert.equal(result.party[0].speciesId, 496)
    assert.ok(result.pokedex)
    assert.deepEqual(result.boxes, [])
  }
})

test('position mirror CRC is checked even with a valid checksum table', () => {
  const save = saveFixture()
  save[0x23f38] ^= 1
  save.writeUInt16LE(crc16(save.subarray(0x23f00, 0x23f8c)), 0x23f9a)
  assert.equal(parseSave(save).position, null)
})

test('backup position comes from the same entry as the recovered party', () => {
  const save = saveFixture([pk5Fixture(496)], [pk5Fixture(502)])
  writePosition(save, 0, 123)
  writePosition(save, 0x24000, 456)
  save[0x19336] ^= 1
  const result = parseSave(save)
  assert.equal(result.backup, true)
  assert.equal(result.position?.mapId, 456)
  assert.equal(result.party[0].speciesId, 502)
  assert.throws(() => parseSave(save, false))
})
