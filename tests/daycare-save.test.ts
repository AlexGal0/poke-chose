import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDaycareBlock, parseSave } from '../bridge/parser.ts'
import { isSaveSnapshot } from '../src/models/party.ts'
import { pk5Fixture, refreshFixtureChecksums, saveFixture } from './helpers/save-fixture.ts'

test('daycare uses the selected save entry and isolates damaged optional data', () => {
  const save = saveFixture(undefined, [])
  save.writeUInt32LE(1, 0x20e00)
  pk5Fixture(506, 4, 9, undefined, { experience: 96, currentHp: 20, maxHp: 20 }).copy(save, 0x20e04)
  save.writeUInt32LE(2288, 0x20ee0)
  save[0x20fc8] = 1
  refreshFixtureChecksums(save)
  const before = Buffer.from(save)
  const result = parseSave(save)
  assert.equal(result.daycare?.slots[0]?.experience, 96)
  assert.equal(result.daycare?.slots[0]?.gainedExperience, 2288)
  assert.equal(result.daycare?.eggAvailable, true)
  assert.equal(result.daycare?.slots[1], null)
  assert.deepEqual(save, before)
  save[0x20fce] ^= 1
  const damaged = parseSave(save)
  assert.equal(damaged.daycare, null)
  assert.equal(damaged.backup, false)
  assert.deepEqual(damaged.party, result.party)
  save[0x19336] ^= 1
  const backup = parseSave(save)
  assert.equal(backup.backup, true)
  assert.deepEqual(backup.daycare, { slots: [null, null], eggAvailable: false })
})

test('daycare block validates occupancy and snapshots keep legacy compatibility', () => {
  const block = Buffer.alloc(460)
  block.fill(255, 4, 224)
  assert.deepEqual(parseDaycareBlock(block), { slots: [null, null], eggAvailable: false })
  block.writeUInt32LE(2)
  assert.throws(() => parseDaycareBlock(block), /occupancy/)
  block.writeUInt32LE(1)
  assert.throws(() => parseDaycareBlock(block))
  assert.throws(() => parseDaycareBlock(block.subarray(0, 459)), /size/)
  const snapshot = { status: 'ready', message: 'readyUpdated', party: [], boxes: [], pokedex: null, updatedAt: null, backup: false }
  assert.equal(isSaveSnapshot(snapshot), true)
  assert.equal(isSaveSnapshot({ ...snapshot, daycare: { slots: [null, null], eggAvailable: false } }), true)
  for (const daycare of [{ slots: [null], eggAvailable: false }, { slots: [null, null], eggAvailable: 1 }]) {
    assert.equal(isSaveSnapshot({ ...snapshot, daycare }), false)
  }
})
