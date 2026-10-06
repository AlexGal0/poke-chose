import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error Experimental read-only battle probe is JavaScript.
import { readActiveCandidates } from '../experiments/melonds-live/active-pokemon.mjs'
import { pk5Fixture } from './helpers/save-fixture.ts'
import { consistentActiveCandidate } from '../src/domain/enemy-prototype.ts'

function fixture() {
  const ram = Buffer.alloc(0x4000)
  ram.writeUInt32LE(3)
  const party = [pk5Fixture(507, 25, 9), pk5Fixture(502, 29, 10), pk5Fixture(520, 29, 11)]
  party.forEach((member, slot) => member.copy(ram, 8 + slot * 220))
  const config = { partyCountAddress: '0x02000000', partyAddress: '0x02000008', partyStride: 220, activeBattleAddresses: ['0x0200100c', '0x0200110c'], activeSlotAddress: '0x02000004' }
  function recordOffset() { return 0x1000 + ram[4] * 0x224 }
  function activate(slot: number) {
    ram[4] = slot
    party[slot].copy(ram, 0x2000)
    for (const base of [0x1000, 0x1100]) {
      const offset = base + slot * 0x224
      ram.writeUInt32LE(0x02002000, offset)
      ram.writeUInt16LE([507, 502, 520][slot], offset + 12)
      ram.writeUInt16LE(80, offset + 14)
      ram.writeUInt16LE(17, offset + 16)
      ram[offset + 24] = [25, 29, 29][slot]
    }
  }
  const reads: number[] = []
  const reader = { socket: { destroyed: false }, async readMemory(address: number, length: number) {
    reads.push(address)
    return Buffer.from(ram.subarray(address - 0x02000000, address - 0x02000000 + length))
  } }
  activate(1)
  return { ram, config, reader, activate, party, reads, recordOffset }
}

test('active Pokémon follows the battle pointer instead of assuming the first party slot', async () => {
  const data = fixture()
  const first = await readActiveCandidates(data.reader, data.config)
  assert.deepEqual(first.map((candidate: { speciesId: number; slot: number }) => [candidate.speciesId, candidate.slot]), [[502, 1], [502, 1]])
  data.activate(2)
  const changed = await readActiveCandidates(data.reader, data.config)
  assert.deepEqual(changed.map((candidate: { speciesId: number; slot: number }) => [candidate.speciesId, candidate.slot]), [[520, 2], [520, 2]])
  assert.equal(data.ram.subarray(8, 228).equals(data.party[0]), true, 'switching does not reorder the real party')
  assert.equal(changed[0].currentHp, 17, 'uses damaged field HP instead of the stale 60 HP in PK5')
  assert.equal(changed[0].maxHp, 80)
})

test('active probe rejects invalid pointers, mismatched records and unrelated individuals', async () => {
  const data = fixture()
  data.ram.writeUInt32LE(0x01000000, data.recordOffset())
  assert.match((await readActiveCandidates(data.reader, data.config))[0].error, /Puntero/)
  assert.equal(data.reads.includes(0x01000000), false)
  data.activate(1)
  data.ram.writeUInt16LE(507, data.recordOffset() + 12)
  assert.match((await readActiveCandidates(data.reader, data.config))[0].error, /Identidad/)
  data.activate(1)
  pk5Fixture(502, 29, 12).copy(data.ram, 0x2000)
  assert.match((await readActiveCandidates(data.reader, data.config))[0].error, /no pertenece/)
})

test('active probe discards a record that changes while its Pokémon is being read', async () => {
  const data = fixture()
  const read = data.reader.readMemory
  let altered = false
  data.reader.readMemory = async (address, length) => {
    const result = await read(address, length)
    if (address === 0x02002000 && !altered) { data.ram[data.recordOffset() + 12] ^= 1; altered = true }
    return result
  }
  assert.match((await readActiveCandidates(data.reader, data.config))[0].error, /cambió/)
})

test('active card requires a matching battle, both own identities and a consistent real slot', () => {
  const enemy = { address: '0x02001000', speciesId: 568, form: 0, level: 21, personality: 1, trainerId: 2 }
  const own = { address: '0x02002000', speciesId: 507, form: 0, level: 25, personality: 3, trainerId: 2, slot: 4, battleSlot: 4 }
  assert.deepEqual(consistentActiveCandidate([enemy, enemy], [own, own]), own)
  assert.equal(consistentActiveCandidate([enemy, {} as typeof enemy], [own, own]), null, 'no stale own Pokémon outside a confirmed battle')
  assert.equal(consistentActiveCandidate([enemy, enemy], [own, { ...own, slot: 0 }]), null)
  assert.equal(consistentActiveCandidate([enemy, enemy], [own, { ...own, personality: 9 }]), null)
  assert.equal(consistentActiveCandidate([enemy, enemy], [own]), null)
  assert.equal(consistentActiveCandidate([enemy, enemy], [{ ...own, slot: 6 }, { ...own, slot: 6 }]), null)
})

test('active selection is required and must remain stable; party order does not decide the active identity', async () => {
  const data = fixture()
  assert.deepEqual(await readActiveCandidates(data.reader, { ...data.config, activeSlotAddress: undefined }), [])
  data.ram[4] = 255
  await assert.rejects(readActiveCandidates(data.reader, data.config), /Índice activo/)
  data.activate(2)
  data.party[2].copy(data.ram, 8)
  data.party[0].copy(data.ram, 8 + 2 * 220)
  const reordered = await readActiveCandidates(data.reader, data.config)
  assert.equal(reordered[0].speciesId, 520)
  assert.equal(reordered[0].slot, 0, 'identity matching finds the current party position')
  assert.equal(reordered[0].battleSlot, 2, 'the selected battle position is independent')
  const read = data.reader.readMemory
  let selectorReads = 0
  data.reader.readMemory = async (address, length) => {
    if (address === 0x02000004 && ++selectorReads === 2) return Buffer.from([1])
    return read(address, length)
  }
  await assert.rejects(readActiveCandidates(data.reader, data.config), /selección activa cambió/)
})
