import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LivePartyController } from '../bridge/citra/live-party-controller.ts'
import { createXLiveBridge } from '../bridge/citra/live-party-server.ts'
import { XProfileMismatch } from '../bridge/citra/x-session.ts'
import { emptyLivePartySnapshot, isLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'
import { createLivePartySource } from '../src/sources/live-party-source.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'
import { readPk6, readPartyPk6 } from '../src/games/x/pk6.ts'
import { readFileSync } from 'node:fs'
import type { BattleReading } from '../src/models/battle.ts'

const pokedex = { seenSpeciesIds: [25, 721], caughtSpeciesIds: [25] }
const boxes = [{ ...readPk6(fixturePk6({ speciesId: 700 }))!, box: 30, slot: 29 }]
const reading = () => ({ party, pokedex, boxes })
const party = [readPartyPk6(fixturePk6({ party: true }), 0)]
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
async function until(predicate: () => boolean) {
  for (let i = 0; i < 200 && !predicate(); i++) await pause(5)
  assert.ok(predicate())
}
test('X live controller starts manually, retains stale data, recovers and suppresses late replies', async () => {
  let mode = 'ready'
  let calls = 0
  let closed = 0
  let finish: ((value: ReturnType<typeof reading>) => void) | undefined
  const controller = new LivePartyController(() => {}, () => ({ close() { closed++ }, async read() {
    calls++
    if (mode === 'error') throw new Error('unavailable')
    if (mode === 'profile') throw new XProfileMismatch()
    if (mode === 'deferred') return new Promise<ReturnType<typeof reading>>(resolve => { finish = resolve })
    return reading()
  } }), 10)
  assert.equal(calls, 0)
  try {
    controller.connect()
    await until(() => controller.snapshot.status === 'ready')
    assert.deepEqual(controller.snapshot.party, party)
    assert.deepEqual(controller.snapshot.pokedex, pokedex)
    mode = 'error'
    await until(() => controller.snapshot.message === 'readError')
    assert.deepEqual(controller.snapshot.party, party)
    assert.deepEqual(controller.snapshot.pokedex, pokedex)
    mode = 'profile'
    await until(() => controller.snapshot.message === 'profileMismatch')
    mode = 'ready'
    await until(() => controller.snapshot.status === 'ready')
    controller.disconnect()
    const stopped = calls
    await pause(25)
    assert.equal(calls, stopped)
    assert.equal(controller.snapshot.enabled, false)
    assert.deepEqual(controller.snapshot.party, party)
    assert.deepEqual(controller.snapshot.pokedex, pokedex)
    mode = 'deferred'; controller.connect()
    await until(() => finish !== undefined)
    controller.disconnect(); finish!(reading())
    await pause(5)
    assert.equal(controller.snapshot.message, 'disconnected')
    assert.ok(closed > 0)
  } finally { controller.disconnect() }
})

test('X live snapshot rejects unsupported capabilities, wrong sources and malformed parties', () => {
  const ready = { ...emptyLivePartySnapshot(), enabled: true, status: 'ready', message: 'ready', party, pokedex, boxes, boxesStatus: 'ready', boxesUpdatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  assert.ok(isLivePartySnapshot(ready))
  for (const invalid of [{ ...ready, sourceId: 'x-save' }, { ...ready, capabilities: { party: true, boxes: true, pokedex: false } }, { ...ready, enabled: false }, { ...ready, party: [] }, { ...ready, updatedAt: null }, { ...ready, pokedex: null }, { ...ready, pokedex: { seenSpeciesIds: [722], caughtSpeciesIds: [] } }, { ...ready, protocol: 1 }, { ...ready, protocol: 2 }, { ...ready, boxes, boxesStatus: 'ready', boxesUpdatedAt: null }, { ...ready, boxes: [{ ...boxes[0], box: 31 }], boxesUpdatedAt: new Date().toISOString() }]) assert.equal(isLivePartySnapshot(invalid), false)
  for (const locale of ['es', 'en']) {
    const data = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${locale}/translation.json`, import.meta.url), 'utf8'))
    for (const code of ['pressConnect', 'connecting', 'ready', 'readError', 'profileMismatch', 'disconnected', 'connectionLost']) assert.equal(typeof data.sources.xLive.messages[code], 'string')
  }
})

test('X live client ignores malformed data, retains the last team and isolates subscriptions', async () => {
  const events = { onmessage: null as null | ((event: { data: string }) => void), onerror: null as null | (() => void), close() {} }
  let endpoint = ''
  const source = createLivePartySource(() => events, async input => { endpoint = String(input); return new Response('{}') })
  const snapshots: ReturnType<typeof emptyLivePartySnapshot>[] = []
  const close = source.subscribe(s => snapshots.push(s))
  const ready = { ...emptyLivePartySnapshot(), enabled: true, status: 'ready', message: 'ready', party, pokedex, boxes, boxesStatus: 'ready', boxesUpdatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  events.onmessage?.({ data: JSON.stringify(ready) })
  events.onerror?.()
  assert.equal(snapshots.at(-1)?.message, 'connectionLost')
  assert.deepEqual(snapshots.at(-1)?.party, party)
  assert.deepEqual(snapshots.at(-1)?.boxes, boxes)
  events.onmessage?.({ data: JSON.stringify(emptyLivePartySnapshot()) })
  assert.deepEqual(snapshots.at(-1)?.party, party)
  assert.deepEqual(snapshots.at(-1)?.boxes, boxes)
  const count = snapshots.length
  events.onmessage?.({ data: JSON.stringify({ ...ready, sourceId: 'save' }) })
  assert.equal(snapshots.length, count)
  await source.control('connect'); assert.equal(endpoint, '/x-live-api/connect')
  await source.control('disconnect'); assert.equal(endpoint, '/x-live-api/disconnect')
  await source.control('refresh'); assert.equal(endpoint, '/x-live-api/refresh')
  close(); events.onmessage?.({ data: JSON.stringify(ready) }); assert.equal(snapshots.length, count)
  const fresh: typeof snapshots = []
  const stop = source.subscribe(s => fresh.push(s))
  assert.equal(fresh[0].party, null); stop()
})

test('X live HTTP bridge requires local JSON controls and stops when its last SSE client leaves', async () => {
  let reads = 0
  const bridge = createXLiveBridge({ factory: () => ({ close() {}, async read() { reads++; return reading() } }), pollMs: 10 })
  const abort = new AbortController()
  try {
    await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
    const address = bridge.server.address()
    assert.ok(address && typeof address === 'object')
    const base = `http://127.0.0.1:${address.port}/x-live-api`
    const post = (action: string, headers = { 'Content-Type': 'application/json' }) => fetch(`${base}/${action}`, { method: 'POST', headers, body: '{}' })
    assert.equal((await post('connect')).status, 403)
    assert.equal((await fetch(`${base}/health`, { headers: { Origin: 'https://remote.invalid' } })).status, 403)
    assert.equal((await fetch(`${base}/connect`)).status, 404)
    const response = await fetch(`${base}/events`, { signal: abort.signal })
    const stream = response.body!.getReader()
    await stream.read()
    assert.equal(reads, 0)
    assert.equal((await post('connect', { 'Content-Type': 'text/plain' })).status, 403)
    assert.equal((await post('connect')).status, 200)
    await until(() => bridge.controller.snapshot.status === 'ready')
    assert.ok(reads > 0)
    assert.equal((await post('reconnect')).status, 200)
    await until(() => bridge.controller.snapshot.status === 'ready')
    assert.equal((await post('disconnect')).status, 200)
    assert.equal(bridge.controller.snapshot.enabled, false)
    assert.equal((await post('connect')).status, 200)
    abort.abort()
    await until(() => !bridge.controller.snapshot.enabled)
  } finally { abort.abort(); await bridge.close() }
})

test('X live boxes use a separate cadence, refresh on demand and retain data on partial failure', async () => {
  let polls = 0
  let boxReads = 0
  let failBoxes = false
  const controller = new LivePartyController(() => {}, () => ({ close() {}, async read(includeBoxes) {
    polls++
    if (includeBoxes) boxReads++
    return { party, pokedex, boxes: includeBoxes && !failBoxes ? boxes : undefined }
  } }), 10, 60000)
  try {
    controller.connect()
    await until(() => controller.snapshot.boxesStatus === 'ready')
    await until(() => polls >= 4)
    assert.equal(boxReads, 1)
    assert.deepEqual(controller.snapshot.boxes, boxes)
    const previousTime = controller.snapshot.boxesUpdatedAt
    failBoxes = true
    controller.refresh()
    await until(() => controller.snapshot.boxesStatus === 'error')
    assert.equal(controller.snapshot.status, 'ready')
    assert.deepEqual(controller.snapshot.boxes, boxes)
    assert.equal(controller.snapshot.boxesUpdatedAt, previousTime)
    failBoxes = false
    controller.refresh()
    await until(() => controller.snapshot.boxesStatus === 'ready')
    assert.equal(boxReads, 3)
    assert.ok(isLivePartySnapshot(controller.snapshot))
    controller.disconnect()
    controller.refresh()
    await pause(25)
    assert.equal(boxReads, 3)
  } finally { controller.disconnect() }
})


test('battle entry, exit and unconfirmed reads update independently of the party', async () => {
  let battle: BattleReading | null = { active: true, own: null, enemy: { identity: '129:1:2', speciesId: 129, form: 0, level: null, currentHp: 22, maxHp: 22, partySlot: null } }
  const controller = new LivePartyController(() => {}, () => ({ close() {}, async read() { return { ...reading(), battle } } }), 10)
  try {
    controller.connect()
    await until(() => controller.snapshot.battle?.active === true)
    battle = { active: false, own: null, enemy: null }
    await until(() => controller.snapshot.battle?.active === false)
    assert.equal(controller.snapshot.battle?.enemy, null)
    battle = null
    await until(() => controller.snapshot.battle === null)
    assert.equal(controller.snapshot.status, 'ready')
    assert.deepEqual(controller.snapshot.party, party)
  } finally { controller.disconnect() }
})

test('location changes publish independently and unconfirmed positions do not remain fresh', async () => {
  let position: { mapId: number } | null = { mapId: 266 }
  const controller = new LivePartyController(() => {}, () => ({ close() {}, async read() { return { ...reading(), position } } }), 10)
  try {
    controller.connect()
    await until(() => controller.snapshot.position?.mapId === 266)
    assert.equal(controller.snapshot.capabilities.location, true)
    position = { mapId: 48 }
    await until(() => controller.snapshot.position?.mapId === 48)
    position = null
    await until(() => controller.snapshot.position === null)
    assert.equal(controller.snapshot.status, 'ready')
    assert.deepEqual(controller.snapshot.party, party)
    assert.deepEqual(controller.snapshot.pokedex, pokedex)
    assert.ok(isLivePartySnapshot(controller.snapshot))
  } finally { controller.disconnect() }
})
