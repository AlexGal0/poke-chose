import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crc16, decryptPk5, parsePk5, parseSave } from '../bridge/parser.ts'
import { partiesEqual } from '../src/models/party.ts'
import { pk5Fixture, refreshFixtureChecksums, saveFixture } from './helpers/save-fixture.ts'

test('CRC16-CCITT known standard vector', () => assert.equal(crc16(Buffer.from('123456789')), 0x29b1))
test('PK5 decrypts all 32 shuffle values, species, level and secondary IDs without mutating input', () => {
  for (let shuffle = 0; shuffle < 32; shuffle++) {
    const encrypted = pk5Fixture(502, 25, shuffle)
    const original = Buffer.from(encrypted)
    const pokemon = parsePk5(encrypted)
    assert.equal(pokemon.speciesId, 502)
    assert.equal(pokemon.level, 25)
    assert.equal(pokemon.heldItemId, 234)
    assert.equal(pokemon.abilityId, 65)
    assert.deepEqual(pokemon.moveIds, [33, 45, 55, 0])
    assert.deepEqual(encrypted, original)
    assert.equal(decryptPk5(encrypted)[0x8c], 25)
  }
})
test('party preserves order, duplicate species and up to six members', () => {
  const save = saveFixture([pk5Fixture(496, 25), pk5Fixture(551, 21), pk5Fixture(554, 23), pk5Fixture(520, 22), pk5Fixture(502, 20), pk5Fixture(502, 21)])
  const result = parseSave(save)
  assert.equal(result.backup, false)
  assert.deepEqual(result.party.map(p => [p.slot, p.speciesId, p.level]), [[0,496,25],[1,551,21],[2,554,23],[3,520,22],[4,502,20],[5,502,21]])
})
test('valid empty party is distinct from invalid or uninitialized save', () => {
  assert.deepEqual(parseSave(saveFixture([])).party, [])
  for (const invalid of [Buffer.alloc(30), Buffer.alloc(0x80000), Buffer.alloc(0x80000, 255)]) assert.throws(() => parseSave(invalid))
})
test('rejects corrupt CRC, mirror, count, PK5 checksum, species and level', () => {
  const badMirror = saveFixture()
  badMirror[0x19336] ^= 1
  assert.throws(() => parseSave(badMirror))
  for (const offset of [0x18e04, 0x18e08 + 12, 0x23f9a]) {
    const save = saveFixture()
    save[offset] ^= 0xff
    if (offset !== 0x23f9a) refreshFixtureChecksums(save)
    assert.throws(() => parseSave(save))
  }
  assert.throws(() => parsePk5(pk5Fixture(650)))
  assert.throws(() => parsePk5(pk5Fixture(502, 0)))
  assert.throws(() => parsePk5(pk5Fixture(502, 101)))
  assert.throws(() => decryptPk5(Buffer.alloc(136)))
})
test('validates BW game and trainer block; rejects B2W2', () => {
  const save = saveFixture()
  save[0x1941f] = 22
  refreshFixtureChecksums(save)
  assert.throws(() => parseSave(save), /Black 2/)
})
test('primary preferred; backup only used explicitly when primary is invalid', () => {
  const save = saveFixture([pk5Fixture(496)], [pk5Fixture(502)])
  assert.equal(parseSave(save).party[0].speciesId, 496)
  save[0x19336] ^= 1
  assert.equal(parseSave(save).backup, true)
  assert.equal(parseSave(save).party[0].speciesId, 502)
  assert.throws(() => parseSave(save, false))
})
test('party equality includes ordering, identity, level, item, ability, moves, form and egg', () => {
  const party = parseSave(saveFixture()).party
  assert.equal(partiesEqual(party, structuredClone(party)), true)
  assert.equal(partiesEqual(null, []), false)
  assert.equal(partiesEqual([], []), true)
  assert.equal(partiesEqual(party, []), false)
  for (const key of ['slot', 'personality', 'trainerId', 'speciesId', 'level', 'heldItemId', 'abilityId', 'form'] as const) {
    assert.equal(partiesEqual(party, [{ ...party[0], [key]: party[0][key] + 1 }]), false)
  }
  assert.equal(partiesEqual(party, [{ ...party[0], isEgg: true }]), false)
  assert.equal(partiesEqual(party, [{ ...party[0], moveIds: [0, 0, 0, 0] }]), false)
})
