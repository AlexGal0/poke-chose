import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error Experimental read-only battle reader is JavaScript.
import { readOwnBattle } from '../experiments/melonds-live/active-pokemon.mjs'
import { pk5Fixture } from './helpers/save-fixture.ts'

function fixture() {
  const ram = Buffer.alloc(0x5000)
  const species = [507, 502, 520]
  const levels = [25, 30, 29]
  ram.writeUInt32LE(3)
  ram[4] = 1
  species.forEach((species, slot) => {
    pk5Fixture(species, levels[slot], 9 + slot).copy(ram, 8 + slot * 220)
    pk5Fixture(species, levels[slot], 9 + slot).copy(ram, 0x3000 + slot * 220)
    for (const base of [0x1000, 0x2000]) {
      const offset = base + slot * 0x224
      ram.writeUInt32LE(0x02003000 + slot * 220, offset)
      ram.writeUInt16LE(species, offset + 12)
      ram.writeUInt16LE(80, offset + 14)
      ram.writeUInt16LE([0, 10, 77][slot], offset + 16)
      ram[offset + 24] = levels[slot]
    }
  })
  const config = { partyCountAddress: '0x02000000', partyAddress: '0x02000008', partyStride: 220, activeBattleAddresses: ['0x0200100c', '0x0200200c'], activeSlotAddress: '0x02000004' }
  const reader = { socket: { destroyed: false }, async readMemory(address: number, length: number) {
    return Buffer.from(ram.subarray(address - 0x02000000, address - 0x02000000 + length))
  } }
  return { ram, reader, config }
}

test('battle team reads field HP for every individual, including fainted reserves, and keeps the active selection', async () => {
  const data = fixture()
  const result = await readOwnBattle(data.reader, data.config)
  assert.deepEqual(result.battleTeam.map((member: { currentHp: number; maxHp: number; slot: number }) => [member.slot, member.currentHp, member.maxHp]), [[0, 0, 80], [1, 10, 80], [2, 77, 80]])
  assert.equal(result.activeCandidates.length, 2)
  assert.equal(result.activeCandidates[0].speciesId, 502)
  data.ram[4] = 2
  assert.equal((await readOwnBattle(data.reader, data.config)).activeCandidates[0].speciesId, 520)
})

test('one corrupt or disagreeing battle member clears only its field HP, never falls back to PK5', async () => {
  const data = fixture()
  data.ram.writeUInt16LE(76, 0x2000 + 2 * 0x224 + 16)
  let team = (await readOwnBattle(data.reader, data.config)).battleTeam
  assert.equal(team[2].currentHp, undefined)
  assert.equal(team[1].currentHp, 10)
  data.ram.writeUInt32LE(0x01000000, 0x1000)
  team = (await readOwnBattle(data.reader, data.config)).battleTeam
  assert.equal(team[0].currentHp, undefined)
  assert.equal(team[1].currentHp, 10)
})

test('battle team associates field copies by individual identity after a party reorder', async () => {
  const data = fixture()
  const first = Buffer.from(data.ram.subarray(8, 228))
  data.ram.copy(data.ram, 8, 8 + 2 * 220, 8 + 3 * 220)
  first.copy(data.ram, 8 + 2 * 220)
  const team = (await readOwnBattle(data.reader, data.config)).battleTeam
  assert.deepEqual(team.map((member: { speciesId: number; currentHp: number }) => [member.speciesId, member.currentHp]), [[520, 77], [502, 10], [507, 0]])
})
