import test from 'node:test'
import assert from 'node:assert/strict'
import { consistentBattleHealth, consistentEnemyCandidate } from '../src/domain/enemy-prototype.ts'
// @ts-expect-error Experimental battle reader is JavaScript.
import { readEnemyVitals, readEnemyBattle } from '../experiments/melonds-live/battle-vitals.mjs'
import { parsePk5 } from '../bridge/parser.ts'
import { pk5Fixture } from './helpers/save-fixture.ts'

const identity = { address: '0x02000000', speciesId: 568, form: 0, level: 19, personality: 1, trainerId: 2 }

test('battle HP requires matching identities and agreeing valid readings, including zero HP', () => {
  const health = { ...identity, currentHp: 10, maxHp: 62 }
  assert.deepEqual(consistentBattleHealth(identity, [health, health]), { currentHp: 10, maxHp: 62 })
  assert.deepEqual(consistentBattleHealth(identity, [{ ...health, currentHp: 0 }, { ...health, currentHp: 0 }]), { currentHp: 0, maxHp: 62 })
  assert.equal(consistentBattleHealth(null, [health, health]), null)
  assert.equal(consistentBattleHealth(identity, [health]), null)
  for (const change of [{ currentHp: 11 }, { currentHp: -1 }, { currentHp: 63 }, { currentHp: 1.5 }, { maxHp: 0 }, { currentHp: undefined }, { personality: 9 }, { speciesId: 502 }, { form: 1 }, { level: 20 }]) {
    assert.equal(consistentBattleHealth(identity, [health, { ...health, ...change }]), null)
  }
})

function fixture() {
  const ram = Buffer.alloc(0x1000)
  const pk5 = pk5Fixture(568, 19)
  pk5.copy(ram, 0x400)
  for (const offset of [0x100, 0x200]) {
    ram.writeUInt32LE(0x02000400, offset)
    ram.writeUInt16LE(568, offset + 12)
    ram.writeUInt16LE(80, offset + 14)
    ram.writeUInt16LE(22, offset + 16)
    ram[offset + 24] = 19
  }
  const reader = { socket: { destroyed: false }, async readMemory(address: number, length: number) {
    return Buffer.from(ram.subarray(address - 0x02000000, address - 0x02000000 + length))
  } }
  const member = { address: '0x02000400', ...parsePk5(pk5) }
  const candidates = [member, member]
  const config = { enemyBattleAddresses: ['0x0200010c', '0x0200020c'] }
  return { ram, reader, candidates, config }
}

test('enemy HP uses stable field records, never the pre-battle HP from PK5', async () => {
  const data = fixture()
  const readings = await readEnemyVitals(data.reader, data.config, data.candidates)
  assert.deepEqual(consistentBattleHealth(data.candidates[0], readings), { currentHp: 22, maxHp: 80 })
  data.ram.writeUInt16LE(0, 0x110)
  data.ram.writeUInt16LE(0, 0x210)
  assert.equal(consistentBattleHealth(data.candidates[0], await readEnemyVitals(data.reader, data.config, data.candidates))?.currentHp, 0)
  data.ram.writeUInt16LE(81, 0x110)
  await assert.rejects(readEnemyVitals(data.reader, data.config, data.candidates), /PS del campo/)
})

test('enemy HP rejects stale identities, unstable records and invalid pointers', async () => {
  const data = fixture()
  assert.deepEqual(await readEnemyVitals(data.reader, data.config, []), [])
  await assert.rejects(readEnemyVitals(data.reader, data.config, data.candidates.map(member => ({ ...member, personality: 1 }))), /rival confirmado/)
  data.ram.writeUInt32LE(0x01000000, 0x100)
  await assert.rejects(readEnemyVitals(data.reader, data.config, data.candidates), /Puntero/)
  data.ram.writeUInt32LE(0x02000400, 0x100)
  const read = data.reader.readMemory
  let altered = false
  data.reader.readMemory = async (address, length) => {
    const result = await read(address, length)
    if (address === 0x02000400 && !altered) {
      data.ram[0x110] ^= 1
      altered = true
    }
    return result
  }
  await assert.rejects(readEnemyVitals(data.reader, data.config, data.candidates), /cambiaron/)
})

test('field opponent detection works without wild copies and follows trainer switches by pointer', async () => {
  const data = fixture()
  const initial = consistentEnemyCandidate(await readEnemyBattle(data.reader, data.config))
  assert.equal(initial?.speciesId, 568)
  assert.equal(initial?.currentHp, 22)
  pk5Fixture(572, 22, 10).copy(data.ram, 0x600)
  for (const offset of [0x100, 0x200]) {
    data.ram.writeUInt32LE(0x02000600, offset)
    data.ram.writeUInt16LE(572, offset + 12)
    data.ram[offset + 24] = 22
  }
  const changed = consistentEnemyCandidate(await readEnemyBattle(data.reader, data.config))
  assert.equal(changed?.speciesId, 572)
  assert.equal(changed?.level, 22)
  assert.notEqual(changed?.personality, initial?.personality)
  data.ram.fill(0, 0x100, 0x11c)
  data.ram.fill(0, 0x200, 0x21c)
  assert.equal(consistentEnemyCandidate(await readEnemyBattle(data.reader, data.config)), null, 'does not fall back to retained PK5 after the battle ends')
})

test('field opponent requires both copies and preserves identity during an HP transition', async () => {
  const data = fixture()
  data.ram.writeUInt32LE(0x01000000, 0x200)
  assert.equal(consistentEnemyCandidate(await readEnemyBattle(data.reader, data.config)), null)
  data.ram.writeUInt32LE(0x02000400, 0x200)
  const read = data.reader.readMemory
  let altered = false
  data.reader.readMemory = async (address, length) => {
    const result = await read(address, length)
    if (address === 0x02000400 && !altered) {
      data.ram.writeUInt16LE(10, 0x110)
      altered = true
    }
    return result
  }
  const candidates = await readEnemyBattle(data.reader, data.config)
  const enemy = consistentEnemyCandidate(candidates)
  assert.equal(enemy?.speciesId, 568)
  assert.equal(consistentBattleHealth(enemy, candidates), null, 'withholds unstable HP without hiding the combat')
  await assert.rejects(readEnemyBattle(data.reader, { enemyBattleAddresses: ['0x01000000', '0x0200020c'] }), /Direcciones/)
})
