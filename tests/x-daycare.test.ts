import test from 'node:test'
import assert from 'node:assert/strict'
import { daycareBlock, xDaycareFixture, refreshDaycareChecksum } from './helpers/x-daycare-fixture.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'
import { readXDaycareBlock } from '../src/games/x/daycare-data.ts'
import { readXSaveDaycare, readXSavePokemon, xSaveReader } from '../src/games/x/save-pokedex.ts'
import { readXMemoryDaycare, X_MEMORY_DAYCARE_ADDRESS } from '../src/games/x/memory-daycare.ts'
import { xDaycareReading, xDaycareService, xDaycareEvolutionLevel } from '../src/games/x/daycare.ts'
import { isDaycareData } from '../src/games/core/daycare.ts'
import { emptyLivePartySnapshot, isLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'
import { emptyPokedexSnapshot, isPokedexBridgeSnapshot } from '../src/sources/pokedex-snapshot.ts'
import { PokedexWatcher } from '../bridge/pokedex-watcher.ts'
import { LivePartyController } from '../bridge/citra/live-party-controller.ts'
import { readPartyPk6 } from '../src/games/x/pk6.ts'
import { createPokedexSource } from '../src/sources/pokedex-source.ts'
import { createLivePartySource } from '../src/sources/live-party-source.ts'
import type { KnowledgeNode } from '../src/domain/species-knowledge.ts'
import type { PokedexBridgeSnapshot } from '../src/sources/pokedex-snapshot.ts'
import type { LivePartySnapshot } from '../src/sources/live-party-snapshot.ts'

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
async function until(predicate: () => boolean) {
  for (let i = 0; i < 200 && !predicate(); i++) await pause(5)
  assert.ok(predicate())
}

test('X daycare reads both PK6 slots, total EXP and egg without mutating the save', () => {
  const bytes = xDaycareFixture({ second: true, egg: true, speciesId: 700 })
  const before = Buffer.from(bytes)
  const data = readXSaveDaycare(bytes)
  assert.equal(data.slots.length, 2)
  assert.deepEqual(data.slots.map(p => [p?.speciesId, p?.experience]), [[700, 6927], [700, 6927]])
  assert.equal(data.eggAvailable, true)
  assert.deepEqual(bytes, before)
  assert.deepEqual(readXSaveDaycare(xDaycareFixture({ empty: true })), { slots: [null, null], eggAvailable: false })
  // A free slot may still contain the old deposited PK6; never reveal it.
  bytes[0x1b200] = 0
  refreshDaycareChecksum(bytes)
  assert.equal(readXSaveDaycare(bytes).slots[0], null)
})

test('X daycare validates metadata, checksum, flags, occupied PK6, eggs and EXP overflow', () => {
  for (const mutate of [
    (b: Buffer) => { b[0x65414 + 38 * 8] ^= 1 },
    (b: Buffer) => { b[0x1b200 + 20] ^= 1 },
    (b: Buffer) => { b[0x1b200] = 2; refreshDaycareChecksum(b) },
    (b: Buffer) => { b[0x1b200 + 0x1e0] = 2; refreshDaycareChecksum(b) },
    (b: Buffer) => { b.fill(0, 0x1b208, 0x1b2f0); refreshDaycareChecksum(b) },
    (b: Buffer) => { fixturePk6({ egg: true }).copy(b, 0x1b208); refreshDaycareChecksum(b) },
    (b: Buffer) => { b.writeUInt32LE(0xffffffff, 0x1b204); refreshDaycareChecksum(b) },
  ]) {
    const bytes = xDaycareFixture()
    mutate(bytes)
    assert.throws(() => readXSaveDaycare(bytes))
    // The daycare block is independent of team, boxes and Pokédex.
    assert.equal(readXSavePokemon(bytes).party.length, 1)
  }
  assert.throws(() => readXDaycareBlock(new Uint8Array(495)))
  assert.throws(() => readXSaveDaycare(new Uint8Array(0x65601)))
})

test('X memory daycare reads exactly two bounded samples and rejects short, changing or corrupt data', async () => {
  const bytes = daycareBlock()
  let calls = 0
  const data = await readXMemoryDaycare({ async read(address, length) {
    assert.equal(address, X_MEMORY_DAYCARE_ADDRESS)
    assert.equal(length, 496)
    calls++
    return bytes
  } })
  assert.equal(calls, 2)
  assert.deepEqual(data, readXDaycareBlock(bytes))
  for (const mode of ['short', 'changed', 'corrupt']) {
    let calls = 0
    await assert.rejects(readXMemoryDaycare({ async read() {
      const sample = Buffer.from(bytes)
      calls++
      if (mode === 'short') return sample.subarray(0, 495)
      if (mode === 'corrupt' || mode === 'changed' && calls === 2) sample[20] ^= 1
      return sample
    } }))
  }
})

test('shared daycare validation applies explicit Gen V/VI limits', () => {
  const data = { slots: [{ speciesId: 700, form: 0, experience: 1000, nickname: 'DoceLetrasXY' }, null], eggAvailable: false }
  assert.ok(isDaycareData(data, 721, 12))
  assert.equal(isDaycareData(data, 649, 10), false)
  for (const invalid of [null, { ...data, slots: [] }, { ...data, eggAvailable: 1 }, { ...data, slots: [{ ...data.slots[0], form: 32 }, null] }, { ...data, slots: [{ ...data.slots[0], experience: -1 }, null] }]) assert.equal(isDaycareData(invalid, 721, 12), false)
  const save = { ...emptyPokedexSnapshot('x-save'), capabilities: { daycare: true }, daycare: data, daycareStale: true }
  assert.ok(isPokedexBridgeSnapshot(save, 'x-save', 721, { maxSpecies: 721, boxCount: 31, nicknameLength: 12 }))
  assert.equal(isPokedexBridgeSnapshot({ ...save, capabilities: {} }, 'x-save', 721, { maxSpecies: 721, boxCount: 31, nicknameLength: 12 }), false)
  assert.ok(isLivePartySnapshot({ ...emptyLivePartySnapshot(), daycare: data }))
  assert.equal(isLivePartySnapshot({ ...emptyLivePartySnapshot(), daycare: { ...data, slots: [] } }), false)
  assert.equal(isLivePartySnapshot({ ...emptyLivePartySnapshot(), daycareStale: false }), false)
})

test('X daycare preserves each individual gender and accepts older snapshots with unknown gender', () => {
  const block = daycareBlock({ second: true })
  fixturePk6({ gender: 'male' }).copy(block, 8)
  fixturePk6({ gender: 'genderless' }).copy(block, 0xf8)
  assert.deepEqual(readXDaycareBlock(block).slots.map(p => p?.gender), ['male', 'genderless'])
  assert.equal(readXDaycareBlock(daycareBlock()).slots[0]?.gender, 'female')
  const member = { speciesId: 133, form: 0, experience: 6859 }
  const data = { slots: [member, null], eggAvailable: false }
  assert.ok(isDaycareData(data, 721, 12))
  for (const gender of ['male', 'female', 'genderless']) assert.ok(isDaycareData({ ...data, slots: [{ ...member, gender }, null] }, 721, 12))
  assert.equal(isDaycareData({ ...data, slots: [{ ...member, gender: 'both' }, null] }, 721, 12), false)
})

test('X source selection keeps Save, live and manual daycare separate and respects old bridges', () => {
  const save: PokedexBridgeSnapshot = { ...emptyPokedexSnapshot('x-save'), capabilities: { daycare: true }, daycare: { slots: [null, null], eggAvailable: false }, daycareStale: false }
  const live = { ...emptyLivePartySnapshot(), daycare: readXDaycareBlock(daycareBlock()) }
  assert.equal(xDaycareReading('manual', save, live).available, false)
  assert.equal(xDaycareReading('save', save, live).data?.slots[0], null)
  assert.equal(xDaycareReading('live', save, live).data?.slots[0]?.speciesId, 133)
  assert.equal(xDaycareReading('live', save, live).stale, true)
  assert.equal(xDaycareReading('save', emptyPokedexSnapshot('x-save'), live).available, false)
})

test('X local species service resolves Gen VI forms, curves, aborts and maximum level', async () => {
  assert.equal((await xDaycareService.resolve(700, 0)).name, 'sylveon')
  assert.equal((await xDaycareService.experienceLevels(133)).length, 100)
  assert.equal((await xDaycareService.experienceLevels(133)).at(-1)?.level, 100)
  await assert.rejects(xDaycareService.resolve(133, 31))
  const controller = new AbortController(); controller.abort()
  await assert.rejects(xDaycareService.resolve(133, 0, controller.signal))
})

test('X daycare evolution countdown excludes Gen VI conditions and later family members', () => {
  const root: KnowledgeNode = { id: 133, name: 'eevee', methods: [], children: [
    { id: 700, name: 'sylveon', methods: [{ trigger: { name: 'level-up', url: '' }, min_level: 20, min_affection: 2 }], children: [] },
  ] }
  assert.equal(xDaycareEvolutionLevel(root, 133), null)
  root.children.push({ id: 134, name: 'test', methods: [{ trigger: { name: 'level-up', url: '' }, min_level: 16 }], children: [] })
  assert.equal(xDaycareEvolutionLevel(root, 133), 16)
  assert.equal(xDaycareEvolutionLevel(root, 700), null)
})

test('save watcher publishes daycare-only changes, retains stale data on optional corruption and recovers', async () => {
  let bytes = xDaycareFixture()
  const watcher = new PokedexWatcher('synthetic-main', 'x-save', xSaveReader, () => {}, { read: async () => Buffer.from(bytes), recoveryMs: 10, retryMs: [] })
  try {
    watcher.start()
    await until(() => watcher.snapshot.daycare?.slots[0]?.experience === 6927)
    const party = watcher.snapshot.party
    bytes = xDaycareFixture({ gained: 69 })
    await until(() => watcher.snapshot.daycare?.slots[0]?.experience === 6928)
    assert.deepEqual(watcher.snapshot.party, party)
    bytes[0x1b220] ^= 1
    await until(() => watcher.snapshot.daycareStale === true)
    assert.equal(watcher.snapshot.status, 'ready')
    assert.equal(watcher.snapshot.daycare?.slots[0]?.experience, 6928)
    bytes = xDaycareFixture({ empty: true })
    await until(() => watcher.snapshot.daycareStale === false && watcher.snapshot.daycare?.slots[0] === null)
  } finally { watcher.stop() }
})

test('live controller preserves daycare after partial failure/disconnect and confirms withdrawal on recovery', async () => {
  let daycare = readXDaycareBlock(daycareBlock()) as ReturnType<typeof readXDaycareBlock> | null
  const party = [readPartyPk6(fixturePk6({ party: true }), 0)]
  const controller = new LivePartyController(() => {}, () => ({ close() {}, async read() { return { party, pokedex: { seenSpeciesIds: [], caughtSpeciesIds: [] }, daycare } } }), 10)
  try {
    controller.connect()
    await until(() => controller.snapshot.daycareStale === false)
    daycare = null
    await until(() => controller.snapshot.daycareStale === true)
    assert.equal(controller.snapshot.status, 'ready')
    assert.equal(controller.snapshot.daycare?.slots[0]?.speciesId, 133)
    daycare = { slots: [null, null], eggAvailable: false }
    await until(() => controller.snapshot.daycareStale === false && controller.snapshot.daycare?.slots[0] === null)
    controller.disconnect()
    assert.equal(controller.snapshot.daycareStale, true)
  } finally { controller.disconnect() }
})

test('SSE clients retain daycare during partial unavailable readings and isolate new subscriptions', () => {
  const limits = { maxSpecies: 721, boxCount: 31, nicknameLength: 12 }
  for (const mode of ['save', 'live']) {
    const events = { onmessage: null as ((event: { data: string }) => void) | null, onerror: null as (() => void) | null, close() {} }
    const source = mode === 'save' ? createPokedexSource('x-save', 721, () => events, limits) : createLivePartySource(() => events)
    const updates: (PokedexBridgeSnapshot | LivePartySnapshot)[] = []
    const close = source.subscribe(snapshot => updates.push(snapshot))
    const base = mode === 'save' ? { ...emptyPokedexSnapshot('x-save'), capabilities: { daycare: true } } : emptyLivePartySnapshot()
    const daycare = readXDaycareBlock(daycareBlock())
    events.onmessage?.({ data: JSON.stringify({ ...base, daycare, daycareStale: false }) })
    events.onmessage?.({ data: JSON.stringify({ ...base, daycare: null, daycareStale: true }) })
    assert.deepEqual(updates.at(-1)?.daycare, daycare)
    assert.equal(updates.at(-1)?.daycareStale, true)
    events.onerror?.()
    assert.deepEqual(updates.at(-1)?.daycare, daycare)
    close()
    const other: (PokedexBridgeSnapshot | LivePartySnapshot)[] = []
    const closeOther = source.subscribe(snapshot => other.push(snapshot))
    assert.ok(other[0].daycare == null)
    closeOther()
  }
})
