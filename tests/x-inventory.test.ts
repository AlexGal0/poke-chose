import { fixturePk6, refreshRosterChecksums } from './helpers/x-roster-fixture.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readXItemsPocket, X_INVENTORY_LIMITS } from '../src/games/x/inventory.ts'
import { readXMemoryInventory, X_MEMORY_INVENTORY_ADDRESS } from '../src/games/x/memory-inventory.ts'
import { readXSaveInventory, readXSavePokemon, xSaveReader } from '../src/games/x/save-pokedex.ts'
import { xInventoryFixture, refreshInventoryChecksum } from './helpers/x-inventory-fixture.ts'
import { inventoryReading, isInventoryReading } from '../src/games/core/inventory.ts'
import { xEvolutionInventory } from '../src/games/x/evolution-inventory.ts'
import { PokedexWatcher } from '../bridge/pokedex-watcher.ts'
import { LivePartyController } from '../bridge/citra/live-party-controller.ts'
import { emptyLivePartySnapshot, isLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'
import { emptyPokedexSnapshot, isPokedexBridgeSnapshot } from '../src/sources/pokedex-snapshot.ts'
import { createPokedexSource } from '../src/sources/pokedex-source.ts'
import { createLivePartySource } from '../src/sources/live-party-source.ts'
import type { PokedexBridgeSnapshot } from '../src/sources/pokedex-snapshot.ts'
import type { LivePartySnapshot } from '../src/sources/live-party-snapshot.ts'

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
async function until(predicate: () => boolean) {
  for (let i = 0; i < 200 && !predicate(); i++) await pause(5)
  assert.ok(predicate())
}
const limits = { maxSpecies: 721, boxCount: 31, nicknameLength: 12, inventory: X_INVENTORY_LIMITS }

test('X save reads the items pocket with CRC, preserves bytes and keeps held counts from that save', () => {
  const bytes = xInventoryFixture(), before = Buffer.from(bytes)
  assert.deepEqual(readXSaveInventory(bytes), { bag: [{ gameIndex: 82, count: 2 }, { gameIndex: 646, count: 1 }], held: [{ gameIndex: 17, count: 2 }] })
  assert.deepEqual(bytes, before)
  assert.deepEqual(readXSaveInventory(xInventoryFixture([])).bag, [])
  bytes[0x402] ^= 1
  assert.throws(() => readXSaveInventory(bytes), /integrity/)
  assert.equal(readXSavePokemon(bytes).party.length, 1)
  refreshInventoryChecksum(bytes)
  assert.doesNotThrow(() => readXSaveInventory(bytes))
  bytes.writeUInt32LE(0, 0x6541c)
  assert.throws(() => readXSaveInventory(bytes), /format/)
})

test('X pocket rejects duplicates, invalid pairs/counts, later IDs and truncated reads', async () => {
  for (const entries of [[[82, 1], [82, 2]], [[0, 1]], [[82, 0]], [[82, 1000]], [[718, 1]]]) {
    assert.throws(() => readXSaveInventory(xInventoryFixture(entries as [number, number][])))
  }
  assert.throws(() => readXItemsPocket(new Uint8Array(1599)))
  const pocket = xInventoryFixture().subarray(0x400, 0xa40)
  const calls: number[] = []
  assert.deepEqual(await readXMemoryInventory({ async read(address, length) { calls.push(address); assert.equal(length, 1600); return pocket } }), readXItemsPocket(pocket))
  assert.deepEqual(calls, [X_MEMORY_INVENTORY_ADDRESS, X_MEMORY_INVENTORY_ADDRESS])
  let call = 0
  await assert.rejects(readXMemoryInventory({ async read() { const next = Buffer.from(pocket); if (call++) next[2]++; return next } }), /changed/)
  await assert.rejects(readXMemoryInventory({ async read() { return pocket.subarray(0, 20) } }), /changed/)
})

test('inventory contract distinguishes unknown and empty, ignores eggs and does not widen Black limits', () => {
  const reading = inventoryReading([{ gameIndex: 646, count: 2 }], [{ isEgg: false, heldItemId: 646 }, { isEgg: true, heldItemId: 646 }])
  assert.deepEqual(xEvolutionInventory(reading, false), { quantities: { 646: { bag: 2, held: 1 } }, stale: false })
  assert.deepEqual(xEvolutionInventory(null, false), { quantities: null, stale: true })
  assert.deepEqual(xEvolutionInventory({ bag: [], held: [] }, false), { quantities: {}, stale: false })
  assert.equal(isInventoryReading(reading, X_INVENTORY_LIMITS), true)
  assert.equal(isInventoryReading(reading, { ...X_INVENTORY_LIMITS, maxItemIndex: 638 }), false)
  for (const data of [{ ...reading, bag: [{ gameIndex: 646, count: -1 }] }, { ...reading, held: [{ gameIndex: 646, count: 937 }] }, { ...reading, held: [{ gameIndex: 646, count: 500 }, { gameIndex: 647, count: 500 }] }]) assert.equal(isInventoryReading(data, X_INVENTORY_LIMITS), false)
})

test('save watcher publishes bag-only changes, retains the whole reading on corruption and recovers', async () => {
  let bytes = xInventoryFixture()
  const watcher = new PokedexWatcher('synthetic-main', 'x-save', xSaveReader, () => {}, { read: async () => Buffer.from(bytes), recoveryMs: 15, retryMs: [] })
  try {
    watcher.start()
    await until(() => watcher.snapshot.inventoryStale === false)
    const updatedAt = watcher.snapshot.updatedAt
    await pause(40)
    assert.equal(watcher.snapshot.updatedAt, updatedAt)
    bytes = xInventoryFixture([[82, 3]])
    await until(() => watcher.snapshot.inventory?.bag[0]?.count === 3)
    assert.notEqual(watcher.snapshot.updatedAt, updatedAt)
    const last = watcher.snapshot.inventory
    bytes[0x402] ^= 1
    fixturePk6({ party: true, heldItemId: 82 }).copy(bytes, 0x14200)
    refreshRosterChecksums(bytes)
    await until(() => watcher.snapshot.inventoryStale === true)
    await until(() => watcher.snapshot.party?.[0]?.heldItemId === 82)
    assert.equal(watcher.snapshot.status, 'ready')
    assert.deepEqual(watcher.snapshot.inventory, last)
    bytes = xInventoryFixture([])
    await until(() => watcher.snapshot.inventoryStale === false && watcher.snapshot.inventory?.bag.length === 0)
  } finally { watcher.stop() }
})

test('live inventory refreshes with boxes, remains a coherent old reading on failure and disconnect', async () => {
  const pokemon = readXSavePokemon(xInventoryFixture())
  let inventory: ReturnType<typeof readXSaveInventory> | undefined = readXSaveInventory(xInventoryFixture())
  const controller = new LivePartyController(() => {}, () => ({ close() {}, async read() { return { ...pokemon, pokedex: { seenSpeciesIds: [], caughtSpeciesIds: [] }, inventory } } }), 10, 15)
  try {
    controller.connect()
    await until(() => controller.snapshot.inventoryStale === false)
    const last = controller.snapshot.inventory
    inventory = undefined
    await until(() => controller.snapshot.inventoryStale === true)
    assert.deepEqual(controller.snapshot.inventory, last)
    inventory = { bag: [], held: [] }
    await until(() => controller.snapshot.inventoryStale === false && controller.snapshot.inventory?.bag.length === 0)
    controller.disconnect()
    assert.equal(controller.snapshot.inventoryStale, true)
  } finally { controller.disconnect() }
})

test('SSE inventory capability is validated and retained atomically across loss and optional failures', () => {
  const inventory = readXSaveInventory(xInventoryFixture())
  for (const mode of ['save', 'live']) {
    const events = { onmessage: null as ((event: { data: string }) => void) | null, onerror: null as (() => void) | null, close() {} }
    const source = mode === 'save' ? createPokedexSource('x-save', 721, () => events, limits) : createLivePartySource(() => events)
    const base = mode === 'save' ? { ...emptyPokedexSnapshot('x-save'), capabilities: { inventory: true } } : emptyLivePartySnapshot()
    const valid = (value: unknown) => mode === 'save' ? isPokedexBridgeSnapshot(value, 'x-save', 721, limits) : isLivePartySnapshot(value)
    assert.equal(valid({ ...base, inventory, inventoryStale: false }), true)
    assert.equal(valid({ ...base, inventory: null, inventoryStale: false }), false)
    assert.equal(valid({ ...base, inventory: { bag: [{ gameIndex: 900, count: 1 }], held: [] } }), false)
    const updates: (PokedexBridgeSnapshot | LivePartySnapshot)[] = []
    const close = source.subscribe(value => updates.push(value))
    events.onmessage?.({ data: JSON.stringify({ ...base, inventory, inventoryStale: false }) })
    events.onmessage?.({ data: JSON.stringify({ ...base, inventory: null, inventoryStale: true }) })
    assert.deepEqual(updates.at(-1)?.inventory, inventory)
    assert.equal(updates.at(-1)?.inventoryStale, true)
    events.onerror?.()
    assert.deepEqual(updates.at(-1)?.inventory, inventory)
    assert.equal(updates.at(-1)?.inventoryStale, true)
    close()
    const closeNext = source.subscribe(value => assert.ok(value.inventory == null))
    closeNext()
  }
})
