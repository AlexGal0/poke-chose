import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePk5, parseStoredPk5 } from '../bridge/parser.ts'
import { readParty } from '../bridge/live/party.mjs'
import { parseBoxes } from '../bridge/live/storage.mjs'
import { boxesEqual, partiesEqual, isSaveSnapshot } from '../src/models/party.ts'
import { pk5Fixture } from './helpers/save-fixture.ts'

test('stored gender survives all shuffles without changing form or source bytes', () => {
  for (let shuffle = 0; shuffle < 32; shuffle++) {
    for (const [value, gender] of ['male', 'female', 'genderless', undefined].entries()) {
      const bytes = pk5Fixture(502, 25, shuffle, undefined, undefined, undefined, { gender: value, form: 7 })
      const before = Buffer.from(bytes)
      assert.equal(parsePk5(bytes).gender, gender)
      assert.equal(parseStoredPk5(bytes.subarray(0, 136))?.gender, gender)
      assert.equal(parsePk5(bytes).form, 7)
      assert.deepEqual(bytes, before)
    }
  }
})

test('live party and boxes expose the stored individual gender', async () => {
  const bytes = pk5Fixture(502, 25, 9, undefined, undefined, undefined, { gender: 1, form: 0 })
  const reader = { async readMemory(address: number) { return address === 100 ? Buffer.from([1, 0, 0, 0]) : Buffer.from(bytes) } }
  assert.equal((await readParty(reader, { partyAddress: 200, partyCountAddress: 100, partyStride: 220 }))[0].gender, 'female')
  const memory = Buffer.alloc(23 * 4096 + 4080)
  bytes.subarray(0, 136).copy(memory)
  assert.equal(parseBoxes(memory, 4096)[0].gender, 'female')
})

test('gender is optional for legacy snapshots, validated when present and detects changes', () => {
  const member = parsePk5(pk5Fixture())
  const snapshot = { status: 'ready', message: 'ready', party: [member], boxes: [], pokedex: null, updatedAt: null, backup: false }
  const { gender, ...legacy } = member
  assert.equal(gender, 'male')
  assert.equal(isSaveSnapshot(snapshot), true)
  assert.equal(isSaveSnapshot({ ...snapshot, party: [legacy] }), true)
  for (const bad of ['both', '', 0, null]) assert.equal(isSaveSnapshot({ ...snapshot, party: [{ ...member, gender: bad }] }), false)
  assert.equal(partiesEqual([member], [{ ...member, gender: 'female' }]), false)
  const box = { ...parseStoredPk5(pk5Fixture().subarray(0, 136))!, box: 0, slot: 0 }
  assert.equal(boxesEqual([box], [{ ...box, gender: 'genderless' }]), false)
})
