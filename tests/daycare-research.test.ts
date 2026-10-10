import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectDaycareEntry } from '../experiments/daycare-save.mjs'
import { crc16 } from '../bridge/parser.ts'
import { pk5Fixture, saveFixture } from './helpers/save-fixture.ts'
import { readFileSync } from 'node:fs'
import { levelFromExperience } from '../src/domain/experience.ts'

function seal(save: Buffer, base = 0) {
  const crc = crc16(save.subarray(base + 0x20e00, base + 0x20fcc))
  save.writeUInt16LE(crc, base + 0x20fce)
  save.writeUInt16LE(crc, base + 0x23f64)
}

test('daycare experience matches the observed Lillipup growth and caps at level 100', () => {
  const { levels } = JSON.parse(readFileSync(new URL('./helpers/medium-slow-experience.json', import.meta.url), 'utf8'))
  const save = saveFixture()
  save.fill(0, 0x20e00, 0x20fcc)
  save.writeUInt32LE(1, 0x20e00)
  Buffer.from(pk5Fixture(506, 4, 0, undefined, { experience: 96 })).copy(save, 0x20e04)
  for (const [gained, expected] of [[0, 4], [2288, 15], [2535 - 96 - 1, 15], [2535 - 96, 16], [1059860 - 96 - 1, 99], [1059860 - 96, 100], [0xffffffff, 100]]) {
    save.writeUInt32LE(gained, 0x20ee0)
    seal(save)
    const pokemon = inspectDaycareEntry(save).slots[0].pokemon
    assert.equal(pokemon.storedLevelByte, 4)
    assert.equal(levelFromExperience(pokemon.storedExperience + pokemon.gainedExperience, levels), expected)
  }
})

test('daycare research reads occupancy, stored level, separate experience and the egg flag', () => {
  const save = saveFixture()
  save.fill(0, 0x20e00, 0x20fcc)
  seal(save)
  assert.deepEqual(inspectDaycareEntry(save), { slots: [{ slot: 0, occupied: false, pokemon: null }, { slot: 1, occupied: false, pokemon: null }], eggAvailable: false })
  for (const slot of [0, 1]) {
    const offset = 0x20e00 + slot * 228
    save.writeUInt32LE(1, offset)
    Buffer.from(pk5Fixture()).copy(save, offset + 4)
    save.writeUInt32LE(321 + slot, offset + 224)
  }
  save[0x20fc8] = 3
  seal(save)
  const result = inspectDaycareEntry(save)
  assert.equal(result.eggAvailable, true)
  assert.equal(result.slots[0].pokemon.gainedExperience, 321)
  assert.equal(result.slots[1].pokemon.gainedExperience, 322)
  assert.ok(result.slots.every(slot => slot.pokemon.storedLevelByte > 0))
  save[0x20fc8] = 2
  seal(save)
  assert.equal(inspectDaycareEntry(save).eggAvailable, false)
})

test('daycare research rejects corrupt entries instead of treating errors as empty', () => {
  const save = saveFixture()
  save.fill(0, 0x20e00, 0x20fcc)
  seal(save)
  save[0x20fce] ^= 1
  assert.throws(() => inspectDaycareEntry(save), /checksum/)
  seal(save)
  save[0x23f64] ^= 1
  assert.throws(() => inspectDaycareEntry(save), /checksum/)
  save.writeUInt32LE(2, 0x20e00)
  seal(save)
  assert.throws(() => inspectDaycareEntry(save), /occupancy/)
  save.writeUInt32LE(1, 0x20e00)
  save.fill(0, 0x20e04, 0x20ee0)
  seal(save)
  assert.throws(() => inspectDaycareEntry(save))
  assert.throws(() => inspectDaycareEntry(save.subarray(0, 100)))
})
