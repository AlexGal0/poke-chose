import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createPokedexSource } from '../src/sources/pokedex-source.ts'
import { emptyPokedexSnapshot, isPokedexBridgeSnapshot, POKEDEX_MESSAGES } from '../src/sources/pokedex-snapshot.ts'
import type { PokedexBridgeSnapshot } from '../src/sources/pokedex-snapshot.ts'
import { loadWorkspacePreference, loadEncounterEquipment } from '../src/storage/workspace-preferences.ts'
import { bridgeSnapshotMessageKey } from '../src/i18n/bridge-messages.ts'
import { discoveredSpecies } from '../src/domain/discovery.ts'
import { deserializePokedex } from '../src/models/pokedex.ts'
import i18n from '../src/i18n/index.ts'

const ready: PokedexBridgeSnapshot = { ...emptyPokedexSnapshot('x-save'), status: 'ready', message: 'ready', pokedex: { caughtSpeciesIds: [659, 721], seenSpeciesIds: [13] }, updatedAt: '2026-10-22T12:00:00Z' }
test('SSE boundary rejects other games, invalid IDs, impossible timestamps and contradictory statuses', () => {
  assert.ok(isPokedexBridgeSnapshot(ready, 'x-save', 721))
  for (const change of [{ sourceId: 'save' }, { protocol: 2 }, { message: '<raw message>' }, { status: 'waiting' }, { updatedAt: null }, { updatedAt: 'invalid' }, { pokedex: null }, { pokedex: { caughtSpeciesIds: [722], seenSpeciesIds: [] } }, { pokedex: { caughtSpeciesIds: [13, 13], seenSpeciesIds: [] } }]) assert.equal(isPokedexBridgeSnapshot({ ...ready, ...change }, 'x-save', 721), false)
  assert.equal(isPokedexBridgeSnapshot(ready, 'x-save', 649), false)
})
test('SSE source retains valid flags on loss/restart, ignores malformed events and disconnects cleanly', () => {
  let url = ''
  let closed = false
  const events: { onmessage: ((event: { data: string }) => void) | null; onerror: (() => void) | null; close: () => void } = { onmessage: null, onerror: null, close: () => { closed = true } }
  const source = createPokedexSource('x-save', 721, endpoint => { url = endpoint; return events })
  const snapshots: PokedexBridgeSnapshot[] = []
  const unsubscribe = source.subscribe(snapshot => snapshots.push(snapshot))
  assert.equal(url, '/x-save-api/events')
  assert.equal(snapshots[0].pokedex, null)
  events.onmessage!({ data: JSON.stringify(ready) })
  assert.deepEqual([...discoveredSpecies(deserializePokedex(snapshots.at(-1)!.pokedex!))], [13, 659, 721])
  assert.equal(discoveredSpecies(deserializePokedex(snapshots.at(-1)!.pokedex!)).has(16), false)
  events.onerror!()
  assert.equal(snapshots.at(-1)!.message, 'connectionLost')
  assert.deepEqual(snapshots.at(-1)!.pokedex, ready.pokedex)
  events.onmessage!({ data: JSON.stringify(emptyPokedexSnapshot('x-save')) })
  assert.deepEqual(snapshots.at(-1)!.pokedex, ready.pokedex)
  const before = snapshots.length
  for (const data of ['invalid', JSON.stringify({ ...ready, sourceId: 'save' }), JSON.stringify({ ...ready, pokedex: null })]) events.onmessage!({ data })
  assert.equal(snapshots.length, before)
  unsubscribe()
  events.onmessage!({ data: JSON.stringify(ready) })
  events.onerror!()
  assert.ok(closed)
  assert.equal(snapshots.length, before)
  const cold: PokedexBridgeSnapshot[] = []
  source.subscribe(snapshot => cold.push(snapshot))()
  assert.equal(cold[0].pokedex, null)
})
test('all X bridge codes resolve through presentation mappings in both languages', () => {
  for (const locale of ['es', 'en']) for (const code of POKEDEX_MESSAGES) {
    const key = bridgeSnapshotMessageKey('x-save', code)
    assert.ok(i18n.exists(key, { lng: locale }), key)
    assert.notEqual(i18n.getFixedT(locale)(key), key)
  }
})
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage') })
test('workspace preferences are game-scoped and equipment defaults to locked on invalid/absent storage', () => {
  const data = new Map([['poke-chose:x:source:v1', '"save"'], ['poke-chose:x:active-tab:v1', '"captures"'], ['poke-chose:bw:v1', '{"surf":true}']])
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null } })
  assert.equal(loadWorkspacePreference('poke-chose:x:source:v1', ['manual', 'save'], 'manual'), 'save')
  assert.equal(loadWorkspacePreference('poke-chose:x:active-tab:v1', ['catalog', 'captures'], 'catalog'), 'captures')
  assert.deepEqual(loadEncounterEquipment('poke-chose:x:encounter-access:v1', ['surf', 'old-rod']), { surf: false, 'old-rod': false })
  data.set('poke-chose:x:encounter-access:v1', '{"surf":true,"old-rod":"true","extra":true}')
  assert.deepEqual(loadEncounterEquipment('poke-chose:x:encounter-access:v1', ['surf', 'old-rod']), { surf: true, 'old-rod': false })
  data.set('poke-chose:x:source:v1', '"live"')
  assert.equal(loadWorkspacePreference('poke-chose:x:source:v1', ['manual', 'save'], 'manual'), 'manual')
  data.set('poke-chose:x:source:v1', 'invalid')
  assert.equal(loadWorkspacePreference('poke-chose:x:source:v1', ['manual', 'save'], 'manual'), 'manual')
})
