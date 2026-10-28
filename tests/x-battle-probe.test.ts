import { test } from 'node:test'
import assert from 'node:assert/strict'
import { probeXBattleTables, probeRosterMatches, probeXBattleIdentity, probeXBattleAliases, probeXBattleContext, probeXBattleReferences, probeXBattleSlotContrast, probeXBattleMetadataSample, compareXBattleMetadata, probeXBattleArenaReferences, X_BATTLE_PROBE_TABLES } from '../bridge/citra/x-battle-probe.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'
import { X_BATTLE_STATE_ADDRESS, X_BATTLE_STAGES_OFFSET } from '../src/games/x/memory-battle.ts'

function fixture() {
  const memory = new Map<number, Buffer>()
  const flag = Buffer.alloc(4); flag.writeUInt32LE(0x40001); memory.set(X_BATTLE_STATE_ADDRESS, flag)
  for (const [index, table] of X_BATTLE_PROBE_TABLES.entries()) {
    const bytes = Buffer.alloc(28)
    for (let slot = 0; slot < 6; slot++) {
      const pointer = 0x08200000 + index * 0x1000 + slot * 0x200
      bytes.writeUInt32LE(pointer, slot * 4)
      const vitals = Buffer.alloc(18)
      vitals.writeUInt16LE(316, 12); vitals.writeUInt16LE(30, 14); vitals.writeUInt16LE(slot, 16)
      memory.set(pointer, vitals)
      memory.set(pointer + X_BATTLE_STAGES_OFFSET, Buffer.from([6, 6, 6, 6, 6, 6, 6]))
    }
    memory.set(table.address, bytes)
  }
  const calls: { address: number; length: number }[] = []
  const reader = { async read(address: number, length: number) {
    calls.push({ address, length })
    const bytes = memory.get(address)
    if (!bytes) throw new Error('Unexpected probe address')
    return bytes.subarray(0, length)
  } }
  return { memory, reader, calls }
}

test('research probe enumerates both sides and copies without collapsing repeated species or fainted slots', async () => {
  const f = fixture()
  const result = await probeXBattleTables(f.reader)
  assert.equal(result.stable, true)
  assert.equal(result.tables.length, 4)
  for (const table of result.tables) {
    assert.equal(table.slots.length, 6)
    assert.equal(table.slots[0].state, 'candidate')
    if (table.slots[0].state === 'candidate') assert.equal(table.slots[0].currentHp, 0)
  }
  assert.ok(f.calls.length <= 130)
  assert.ok(f.calls.every(call => call.length <= 28))
})

test('inactive state never follows reused table pointers or claims confirmed empty slots', async () => {
  const f = fixture()
  f.memory.get(X_BATTLE_STATE_ADDRESS)!.writeUInt32LE(0x40000)
  const result = await probeXBattleTables(f.reader)
  assert.ok(result.tables.every(table => table.slots.every(slot => slot.state === 'not-in-active-battle')))
  assert.ok(f.calls.every(call => call.address < 0x08200000))
})

test('zero, invalid and duplicate pointers remain diagnostics rather than topology or format', async () => {
  const f = fixture()
  const table = f.memory.get(X_BATTLE_PROBE_TABLES[0].address)!
  table.writeUInt32LE(0, 0); table.writeUInt32LE(0xffffffff, 4)
  table.writeUInt32LE(table.readUInt32LE(8), 12)
  const result = await probeXBattleTables(f.reader)
  assert.equal(result.tables[0].slots[0].state, 'zero-pointer')
  assert.equal(result.tables[0].slots[1].state, 'invalid-pointer')
  assert.equal(result.tables[0].slots[2].pointer, result.tables[0].slots[3].pointer)
  assert.equal('format' in result, false)
})

test('probe rejects truncation, changing headers and changing participant data', async () => {
  const short = fixture(); short.memory.set(X_BATTLE_PROBE_TABLES[0].address, Buffer.alloc(4))
  await assert.rejects(probeXBattleTables(short.reader), /Incomplete/)
  const moving = fixture(); let reads = 0
  await assert.rejects(probeXBattleTables({ async read(address, length) {
    const bytes = Buffer.from(await moving.reader.read(address, length))
    if (address === X_BATTLE_STATE_ADDRESS && ++reads > 1) bytes.writeUInt32LE(0x40000)
    return bytes
  } }), /header changed/)
  const changing = fixture(); let vitalsReads = 0
  await assert.rejects(probeXBattleTables({ async read(address, length) {
    const bytes = Buffer.from(await changing.reader.read(address, length))
    if (address === 0x08200000 && ++vitalsReads > 1) bytes.writeUInt16LE(20, 16)
    return bytes
  } }), /between passes/)
})

test('species and max HP matches preserve ambiguity and unknown roster availability', () => {
  const candidate = { speciesId: 316, maxHp: 30 }
  assert.deepEqual(probeRosterMatches(candidate, [{ ...candidate, slot: 0 }, { ...candidate, slot: 3 }]), [0, 3])
  assert.deepEqual(probeRosterMatches(candidate, []), [])
  assert.equal(probeRosterMatches(candidate, null), null)
})

test('linked identity requires the PK6 object pointers, stable reads and a valid checksum', async () => {
  const address = 0x081feb60
  const object = Buffer.alloc(12)
  object.writeUInt32LE(address + 64, 4); object.writeUInt32LE(address + 408, 8)
  const pk6 = fixturePk6({ party: true, speciesId: 316, level: 10 })
  const memory = new Map([[address, object], [address + 64, pk6.subarray(0, 232)], [address + 408, pk6.subarray(232, 254)]])
  const reader = { async read(at: number, length: number) {
    const bytes = memory.get(at)
    if (!bytes) throw new Error('Unexpected identity address')
    return bytes.subarray(0, length)
  } }
  const identity = await probeXBattleIdentity(reader, address)
  assert.equal(identity.speciesId, 316)
  assert.equal(identity.level, 10)
  pk6[10] ^= 1
  await assert.rejects(probeXBattleIdentity(reader, address))
  object.writeUInt32LE(address + 65, 4)
  await assert.rejects(probeXBattleIdentity(reader, address), /identity links/)
  await assert.rejects(probeXBattleIdentity(reader, 0xffffffff), /candidate/)
})

test('bounded alias probe excludes roster tables and reports only known links', async () => {
  const f = fixture(), tables = await probeXBattleTables(f.reader)
  const bytes = Buffer.alloc(0x800)
  bytes.writeUInt32LE(tables.tables[0].slots[0].pointer, 0x80)
  bytes.writeUInt32LE(tables.tables[0].slots[0].pointer, 0x284)
  bytes.writeUInt32LE(0xdeadbeef, 0x84)
  const calls: number[] = []
  const aliases = await probeXBattleAliases({ async read(address, length) {
    assert.equal(address, 0x081fb000); calls.push(length); return bytes
  } }, tables)
  assert.deepEqual(aliases, [{ address: 0x081fb080, sideCandidate: 'own', copy: 0, slot: 0, target: 'statistics' }])
  assert.deepEqual(calls, [0x800, 0x800])
})

test('reference and scalar diagnostics reject a changing context and never emit its raw bytes', async () => {
  const f = fixture(), tables = await probeXBattleTables(f.reader)
  let reads = 0
  await assert.rejects(probeXBattleReferences({ async read(_address, length) {
    const bytes = Buffer.alloc(length)
    bytes[0] = ++reads
    return bytes
  } }, tables), /context changed/)
  const result = await probeXBattleContext({ async read(address, length) {
    assert.equal(length, 0x240)
    assert.ok([0x081fb140, 0x081fb4e0].includes(address))
    const bytes = Buffer.alloc(length)
    bytes.writeUInt32LE(5, 4)
    bytes.writeUInt32LE(0xdeadbeef, 8)
    return bytes
  } })
  assert.deepEqual(result, [{ address: 0x081fb144, mirrorCandidateAddress: 0x081fb4e4, values: [5, 5] }])
})

test('slot contrast describes hypotheses without treating zero-valued record flags as absence', async () => {
  const f = fixture(), tables = await probeXBattleTables(f.reader)
  const result = await probeXBattleSlotContrast({ async read(address, length) {
    assert.equal(length, 0x244)
    const table = tables.tables.find(table => table.side === 'own' && table.slots.some(slot => slot.pointer === address))!
    const index = table.slots.findIndex(slot => slot.pointer === address)
    const bytes = Buffer.alloc(length)
    bytes[0x158] = index < 2 ? 1 : 0
    return bytes
  } }, tables)
  assert.deepEqual(result, [{ offset: 0x158, values: [1, 1, 0, 0, 0, 0] }])
  assert.equal('activePositions' in result, false)
})

test('metadata comparison emits changed scalar candidates and excludes relocated RAM pointers', () => {
  const before = Buffer.alloc(0x800), after = Buffer.alloc(0x800)
  before.writeUInt32LE(2, 0x40); after.writeUInt32LE(4, 0x40)
  before.writeUInt32LE(0x08200000, 0x44); after.writeUInt32LE(0x08201000, 0x44)
  before.writeUInt32LE(6, 0x48); after.writeUInt32LE(6, 0x48)
  before.writeUInt32LE(0x01010000, 0x4c); after.writeUInt32LE(0x05010000, 0x4c)
  assert.deepEqual(compareXBattleMetadata(before, after), [
    { address: 0x081fb040, before: 2, after: 4 },
    { address: 0x081fb04c, before: 0x01010000, after: 0x05010000 },
  ])
  assert.throws(() => compareXBattleMetadata(before.subarray(1), after), /Invalid/)
})

test('metadata sampling is bounded, detached from reader buffers and rejects changing data', async () => {
  const memory = Buffer.alloc(0x800)
  const stable = await probeXBattleMetadataSample({ async read(address, length) {
    assert.equal(address, 0x081fb000); assert.equal(length, 0x800); return memory
  } })
  memory[0] = 1
  assert.equal(stable[0], 0)
  let count = 0
  await assert.rejects(probeXBattleMetadataSample({ async read() {
    const bytes = Buffer.alloc(0x800); bytes[0] = ++count; return bytes
  } }), /changing/)
})

test('arena investigation reports only stable known references inside its fixed window', async () => {
  const f = fixture(), tables = await probeXBattleTables(f.reader)
  let calls = 0
  const result = await probeXBattleArenaReferences({ async read(address, length) {
    assert.ok(address >= 0x081f8000 && address < 0x081fc000)
    assert.equal(length, 0x1000)
    const bytes = Buffer.alloc(length)
    if (address === 0x081f8000) {
      bytes.writeUInt32LE(tables.tables[0].slots[0].pointer, 0)
      bytes.writeUInt32LE(++calls === 1 ? tables.tables[0].slots[1].pointer : 0, 4)
      bytes.writeUInt32LE(0xdeadbeef, 8)
    }
    return bytes
  } }, tables)
  assert.deepEqual(result, [{ address: 0x081f8000, side: 'own', copy: 0, slot: 0, target: 'statistics' }])
})
