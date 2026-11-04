import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ySaveReader } from '../src/games/y/save-pokedex.ts'
import { xSaveReader } from '../src/games/x/save-pokedex.ts'
import { checkXYEdition, XY_STATUS_ADDRESS, XYProfileMismatch } from '../bridge/citra/x-session.ts'
import { xInventoryFixture } from './helpers/x-inventory-fixture.ts'
import { xDaycareFixture } from './helpers/x-daycare-fixture.ts'
import { refreshXChecksums } from './helpers/x-pokedex-fixture.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'
import { readPartyPk6 } from '../src/games/x/pk6.ts'
import { emptyLivePartySnapshot, isLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'
import type { LivePartySnapshot } from '../src/sources/live-party-snapshot.ts'
import { createLivePartySource } from '../src/sources/live-party-source.ts'
import { createXLiveBridge } from '../bridge/citra/live-party-server.ts'
import { yCaptureLocation } from '../src/games/y/capture-location.ts'
import { bridgeSnapshotMessageKey } from '../src/i18n/bridge-messages.ts'

test('Y save reader validates the edition, all core blocks and inventory without weakening X', () => {
  const bytes = xInventoryFixture()
  bytes[0x14004] = 25
  refreshXChecksums(bytes)
  const before = Buffer.from(bytes)
  assert.equal(ySaveReader.parsePokemon(bytes).party.length, 1)
  assert.equal(ySaveReader.parsePokemon(bytes).boxes[0].speciesId, 700)
  assert.ok(ySaveReader.parse(bytes).caughtSpeciesIds.has(653))
  assert.equal(ySaveReader.parseInventory(bytes).bag[0].count, 2)
  assert.throws(() => xSaveReader.parse(bytes), /game/)
  assert.deepEqual(bytes, before)
  const damaged = Buffer.from(bytes)
  damaged[0x15009] ^= 1
  assert.throws(() => ySaveReader.parse(damaged), /integrity/)
  assert.throws(() => ySaveReader.parse(bytes.subarray(1)), /size/)
  assert.throws(() => ySaveReader.parse(xInventoryFixture()), /game/)
})

test('Y save Day Care uses the same checksum-validated layout with its own edition guard', () => {
  const bytes = xDaycareFixture()
  bytes[0x14004] = 25
  refreshXChecksums(bytes)
  assert.ok(ySaveReader.parseDaycare(bytes))
  assert.throws(() => xSaveReader.parseDaycare(bytes), /game/)
})

test('live edition guard rejects the other game, short reads and an edition switch between samples', async () => {
  const reader = (values: number[]) => ({ async read(address: number, size: number) {
    assert.equal(address, XY_STATUS_ADDRESS + 4)
    assert.equal(size, 1)
    return Uint8Array.of(values.shift()!)
  } })
  await checkXYEdition(reader([25, 25]), 25)
  await checkXYEdition(reader([24, 24]), 24)
  await assert.rejects(checkXYEdition(reader([25, 25]), 24), XYProfileMismatch)
  await assert.rejects(checkXYEdition(reader([24, 24]), 25), XYProfileMismatch)
  await assert.rejects(checkXYEdition(reader([25, 24]), 25), XYProfileMismatch)
  await assert.rejects(checkXYEdition({ read: async () => new Uint8Array() }, 25), XYProfileMismatch)
})

test('Y frontend connects only to Y endpoints and ignores otherwise valid X snapshots', async () => {
  const events = { onmessage: null as ((event: { data: string }) => void) | null, onerror: null as (() => void) | null, close() {} }
  const urls: string[] = []
  const source = createLivePartySource(url => { urls.push(url); return events }, async url => { urls.push(String(url)); return Response.json({ ok: true }) }, 'y-live')
  const snapshots: LivePartySnapshot[] = []
  assert.equal(source.sourceId, 'y-live')
  const stop = source.subscribe(snapshot => snapshots.push(snapshot))
  try {
    assert.equal(snapshots[0].sourceId, 'y-live')
    events.onmessage?.({ data: JSON.stringify(emptyLivePartySnapshot('x-live')) })
    assert.equal(snapshots.length, 1)
    events.onmessage?.({ data: JSON.stringify(emptyLivePartySnapshot('y-live')) })
    assert.equal(snapshots.length, 2)
    await source.control('connect')
    await source.control('refresh')
    await source.control('disconnect')
    assert.deepEqual(urls, ['/y-live-api/events', '/y-live-api/connect', '/y-live-api/refresh', '/y-live-api/disconnect'])
    assert.ok(isLivePartySnapshot(emptyLivePartySnapshot('y-live')))
    assert.ok(isLivePartySnapshot(emptyLivePartySnapshot('x-live')))
    assert.equal(isLivePartySnapshot({ ...emptyLivePartySnapshot('y-live'), sourceId: 'black-live' }), false)
  } finally { stop() }
})

test('Y live HTTP and SSE identify Y, reject X routes and deliver its own readings', async () => {
  const party = [readPartyPk6(fixturePk6({ party: true }), 0)]
  const bridge = createXLiveBridge({ sourceId: 'y-live', factory: () => ({ close() {}, async read() {
    return { party, pokedex: { seenSpeciesIds: [653], caughtSpeciesIds: [653] }, boxes: [] }
  } }), pollMs: 20 })
  const abort = new AbortController()
  try {
    await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
    const address = bridge.server.address()
    assert.ok(address && typeof address === 'object')
    const base = `http://127.0.0.1:${address.port}`
    assert.equal((await fetch(`${base}/x-live-api/health`)).status, 404)
    assert.equal((await (await fetch(`${base}/y-live-api/health`)).json()).service, 'y-live')
    const response = await fetch(`${base}/y-live-api/events`, { signal: abort.signal })
    const stream = response.body!.getReader()
    const first = new TextDecoder().decode((await stream.read()).value)
    assert.ok(first.includes('"sourceId":"y-live"'))
    assert.equal((await fetch(`${base}/y-live-api/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 200)
    for (let i = 0; i < 100 && bridge.controller.snapshot.status !== 'ready'; i++) await new Promise(resolve => setTimeout(resolve, 5))
    assert.equal(bridge.controller.snapshot.sourceId, 'y-live')
    assert.equal(bridge.controller.snapshot.status, 'ready')
    assert.ok(isLivePartySnapshot(bridge.controller.snapshot))
    assert.deepEqual(bridge.controller.snapshot.party, party)
  } finally { abort.abort(); await bridge.close() }
})

test('Y location scope and bridge translations never use X state or messages', () => {
  assert.equal(yCaptureLocation('save').scope, 'y:save')
  assert.equal(yCaptureLocation('save').available, false)
  assert.equal(bridgeSnapshotMessageKey('y-save', 'ready'), 'sources.ySave.messages.ready')
  assert.equal(bridgeSnapshotMessageKey('y-live', 'profileMismatch'), 'sources.yLive.messages.profileMismatch')
  for (const locale of ['es', 'en']) {
    const translations = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${locale}/translation.json`, import.meta.url), 'utf8'))
    assert.doesNotMatch(JSON.stringify([translations.sources.ySave, translations.sources.yLive]), /\bX\b/)
  }
})
