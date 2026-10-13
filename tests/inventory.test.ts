import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSave } from '../bridge/parser.ts'
import { parseInventoryBlock } from '../bridge/inventory.ts'
import { isSaveSnapshot } from '../src/models/party.ts'
import { refreshFixtureChecksums, saveFixture } from './helpers/save-fixture.ts'

test('inventory parses item pairs, rejects invalid counts and isolates corruption from the selected save entry', () => {
  const save = saveFixture()
  save.writeUInt16LE(80, 0x18400)
  save.writeUInt16LE(3, 0x18402)
  refreshFixtureChecksums(save)
  assert.deepEqual(parseSave(save).inventory, [{ gameIndex: 80, count: 3 }])
  save[0x18402] ^= 1
  assert.equal(parseSave(save).inventory, null)
  assert.equal(parseSave(save).party.length, 1)
  save.writeUInt16LE(1000, 0x18402)
  refreshFixtureChecksums(save)
  assert.equal(parseSave(save).inventory, null)
  assert.throws(() => parseInventoryBlock(new Uint8Array(1)))
  const empty = parseSave(saveFixture())
  assert.deepEqual(empty.inventory, [])
  const snapshot = { ...empty, status: 'ready', message: 'readyUpdated', updatedAt: null, pokedex: { seenSpeciesIds: [], caughtSpeciesIds: [] } }
  assert.equal(isSaveSnapshot(snapshot), true)
  assert.equal(isSaveSnapshot({ ...snapshot, inventory: [{ gameIndex: 80, count: -1 }] }), false)
  assert.equal(isSaveSnapshot({ ...snapshot, inventory: undefined }), true)
})
