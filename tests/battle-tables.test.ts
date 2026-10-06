import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error Experimental battle reader is JavaScript.
import { readEnemyBattle } from '../experiments/melonds-live/battle-vitals.mjs'
// @ts-expect-error Experimental battle reader is JavaScript.
import { readOwnBattle } from '../experiments/melonds-live/active-pokemon.mjs'
import { consistentEnemyCandidate, consistentActiveCandidate } from '../src/domain/enemy-prototype.ts'
import { consistentStatStages } from '../src/domain/battle-stat-stages.ts'
// @ts-expect-error Experimental battle reader is JavaScript.
import { readBattlePresence } from '../experiments/melonds-live/battle-tables.mjs'
import { pk5Fixture } from './helpers/save-fixture.ts'

function fixture() {
  const start = 0x02000000
  const ram = Buffer.alloc(0x8000)
  ram[0] = 2
  pk5Fixture(522, 24, 9).copy(ram, 0x100)
  pk5Fixture(507, 27, 10).copy(ram, 0x100 + 220)
  pk5Fixture(513, 23, 11).copy(ram, 0x6800)
  const tables = [0x800, 0x840]
  function record(offset: number, pokemon: number, species: number, level: number, hp: number) {
    ram.writeUInt32LE(start + pokemon, offset)
    ram.writeUInt16LE(species, offset + 12)
    ram.writeUInt16LE(80, offset + 14)
    ram.writeUInt16LE(hp, offset + 16)
    ram[offset + 24] = level
    ram.fill(6, offset + 0xfc, offset + 0x103)
  }
  for (const [copy, table] of tables.entries()) {
    const base = copy === 0 ? 0x1000 : 0x3000
    record(base, 0x100 + 220, 507, 27, 73)
    record(base + 0x224, 0x100, 522, 24, 0)
    record(base + 0x600, 0x6800, 513, 23, 51)
    ram.writeUInt32LE(start + base, table)
    ram.writeUInt32LE(start + base + 0x224, table + 4)
    ram.writeUInt32LE(start + base + 0x600, table + 28)
  }
  const config = { partyCountAddress: start, partyAddress: start + 0x100, partyStride: 220,
    battlePointerTables: tables.map(offset => start + offset), battleStatStagesOffset: 252,
    // Stale fallback addresses must not influence the dynamic path.
    activeBattleAddresses: [start + 0x700c, start + 0x710c], activeSlotAddress: start + 4,
    enemyBattleAddresses: [start + 0x720c, start + 0x730c] }
  const reader = { socket: { destroyed: false }, async readMemory(address: number, length: number) {
    return Buffer.from(ram.subarray(address - start, address - start + length))
  } }
  return { ram, tables, config, reader, record, start }
}

test('battle tables locate displaced trainer opponents and the active own Pokemon after fainting', async () => {
  const data = fixture()
  const enemies = await readEnemyBattle(data.reader, data.config)
  assert.equal(consistentEnemyCandidate(enemies)?.speciesId, 513)
  assert.equal(consistentEnemyCandidate(enemies)?.currentHp, 51)
  const own = await readOwnBattle(data.reader, data.config)
  const active = consistentActiveCandidate(enemies, own.activeCandidates)
  assert.equal(active?.speciesId, 507)
  assert.equal(active?.slot, 1)
  assert.equal(active?.currentHp, 73)
  assert.equal(own.battleTeam[0].currentHp, 0)
})

test('battle tables follow relocated opponent records and own switches without changing party order', async () => {
  const data = fixture()
  pk5Fixture(515, 23, 12).copy(data.ram, 0x6900)
  for (const [copy, table] of data.tables.entries()) {
    const offset = 0x5000 + copy * 0x100
    data.record(offset, 0x6900, 515, 23, 58)
    data.ram.writeUInt32LE(data.start + offset, table + 28)
    const oldActive = data.ram.readUInt32LE(table)
    data.ram.writeUInt32LE(data.ram.readUInt32LE(table + 4), table)
    data.ram.writeUInt32LE(oldActive, table + 4)
  }
  const enemies = await readEnemyBattle(data.reader, data.config)
  assert.equal(consistentEnemyCandidate(enemies)?.speciesId, 515)
  const own = await readOwnBattle(data.reader, data.config)
  assert.equal(consistentActiveCandidate(enemies, own.activeCandidates)?.speciesId, 522)
  assert.equal(own.battleTeam[1].speciesId, 507)
})

test('battle tables reject invalid pointers and a table that changes during sampling', async () => {
  const data = fixture()
  await assert.rejects(readEnemyBattle(data.reader, { ...data.config, battlePointerTables: [0x01000000, 0x02000840] }), /Tablas/)
  data.ram.writeUInt32LE(0, data.tables[0] + 28)
  await assert.rejects(readEnemyBattle(data.reader, data.config), /Puntero/)
  data.ram.writeUInt32LE(data.start + 0x1600, data.tables[0] + 28)
  const read = data.reader.readMemory
  data.reader.readMemory = async (address, length) => {
    const result = await read(address, length)
    if (address === data.start + 0x6800) data.ram.writeUInt32LE(0, data.tables[1] + 28)
    return result
  }
  await assert.rejects(readEnemyBattle(data.reader, data.config), /tablas de combate cambiaron/)
})

test('invalidated battle tables do not fall back to old records after combat ends', async () => {
  const data = fixture()
  assert.ok(consistentEnemyCandidate(await readEnemyBattle(data.reader, data.config)))
  for (const table of data.tables) data.ram.fill(0, table, table + 32)
  await assert.rejects(readEnemyBattle(data.reader, data.config), /Puntero/)
})

test('stat changes update independently for each participant and clear when copies disagree', async () => {
  const data = fixture()
  for (const base of [0x1000, 0x3000]) {
    data.ram[base + 0xfc] = 8
    data.ram[base + 0xfd] = 4
    data.ram[base + 0x600 + 0x100] = 7
  }
  const enemies = await readEnemyBattle(data.reader, data.config)
  const enemy = consistentEnemyCandidate(enemies)
  const own = await readOwnBattle(data.reader, data.config)
  const active = consistentActiveCandidate(enemies, own.activeCandidates)
  assert.equal(consistentStatStages(enemy, enemies)?.speed, 1)
  assert.equal(consistentStatStages(active, own.activeCandidates)?.attack, 2)
  assert.equal(consistentStatStages(active, own.activeCandidates)?.defense, -2)
  data.ram[0x1600 + 0x100] = 8
  const disagree = await readEnemyBattle(data.reader, data.config)
  assert.equal(consistentEnemyCandidate(disagree)?.speciesId, 513)
  assert.equal(consistentStatStages(enemy, disagree), null)
  data.ram.fill(6, 0x1600 + 0xfc, 0x1600 + 0x103)
  data.ram.fill(6, 0x3600 + 0xfc, 0x3600 + 0x103)
  assert.equal(consistentStatStages(enemy, await readEnemyBattle(data.reader, data.config))?.speed, 0)
})

test('unstable or invalid stat bytes withhold changes while preserving combat identity', async () => {
  const data = fixture()
  data.ram[0x1600 + 0xfc] = 13
  const invalid = await readEnemyBattle(data.reader, data.config)
  assert.equal(consistentEnemyCandidate(invalid)?.speciesId, 513)
  assert.equal(consistentStatStages(consistentEnemyCandidate(invalid), invalid), null)
  data.ram[0x1600 + 0xfc] = 6
  const read = data.reader.readMemory
  data.reader.readMemory = async (address, length) => {
    const result = await read(address, length)
    if (address === data.start + 0x6800) data.ram[0x1600 + 0xfc] = 7
    return result
  }
  const unstable = await readEnemyBattle(data.reader, data.config)
  assert.equal(consistentEnemyCandidate(unstable)?.speciesId, 513)
  assert.equal(consistentStatStages(consistentEnemyCandidate(unstable), unstable), null)
})

test('battle presence survives missing trainer opponents and ends only after both tables release participants', async () => {
  const data = fixture()
  assert.equal(await readBattlePresence(data.reader, data.config), true)
  for (const table of data.tables) data.ram.writeUInt32LE(0, table + 28)
  assert.equal(await readBattlePresence(data.reader, data.config), true, 'own battle pointers keep the battle active between opponents')
  data.ram.writeUInt32LE(0, data.tables[0])
  assert.equal(await readBattlePresence(data.reader, data.config), null, 'partially released tables are inconclusive')
  data.ram.writeUInt32LE(0, data.tables[1])
  assert.equal(await readBattlePresence(data.reader, data.config), false)
  data.ram.writeUInt32LE(0x5544, data.tables[0])
  data.ram.writeUInt32LE(0x74726170, data.tables[0] + 28)
  assert.equal(await readBattlePresence(data.reader, data.config), false, 'released memory may be reused by field objects')
})

test('unstable battle tables cannot confirm the end', async () => {
  const data = fixture()
  const read = data.reader.readMemory
  let tableReads = 0
  data.reader.readMemory = async (address, length) => {
    const result = await read(address, length)
    if (++tableReads === 2) for (const table of data.tables) data.ram.fill(0, table, table + 32)
    return result
  }
  assert.equal(await readBattlePresence(data.reader, data.config), null)
})
