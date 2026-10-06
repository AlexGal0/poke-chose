import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { resolveCollection, subscribeSaveTeam } from '../src/sources/team.ts'
import type { TeamSourceState } from '../src/sources/team.ts'
import type { SaveSnapshot } from '../src/models/party.ts'
import { parsePk5, parseStoredPk5 } from '../bridge/parser.ts'
import { pk5Fixture } from './helpers/save-fixture.ts'

const boxed = (id: number, box: number, slot: number) => ({ ...parseStoredPk5(pk5Fixture(id).subarray(0, 136))!, box, slot })
const response = (id: number) => new Response(JSON.stringify({ id, name: `pokemon-${id}`, types: [{ slot: 1, type: { name: 'normal' } }], past_types: [], sprites: { versions: { 'generation-v': { 'black-white': { front_default: null } } } } }))

test('collection merges party + boxes, keeps duplicates and physical positions, bounds API concurrency and shares species requests', async () => {
  const original = globalThis.fetch
  const requests: number[] = []
  let active = 0
  let maximum = 0
  globalThis.fetch = async input => {
    const id = Number(String(input).split('/').at(-1))
    requests.push(id)
    maximum = Math.max(maximum, ++active)
    await delay(5)
    active--
    return response(id)
  }
  try {
    const party = [parsePk5(pk5Fixture(502))]
    const boxes = [boxed(502, 0, 0), ...Array.from({ length: 10 }, (_, index) => boxed(504 + index, 23, index))]
    const result = await resolveCollection(party, boxes, new AbortController().signal)
    assert.equal(result.length, 12)
    assert.deepEqual(result.slice(0, 2).map(member => [member.location, member.box, member.slot, member.level]), [['party', null, 0, 25], ['box', 0, 0, null]])
    assert.equal(requests.filter(id => id === 502).length, 1)
    assert.equal(requests.length, 11)
    assert.ok(maximum <= 4)
    assert.equal(new Set(result.map(member => member.instanceKey)).size, 12)
    assert.deepEqual(await resolveCollection([], [], new AbortController().signal), [])
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(resolveCollection(party, boxes, controller.signal), { name: 'AbortError' })
  } finally { globalThis.fetch = original }
})

test('box-only SSE updates collection without replacing team/dex; release, errors and empty saves retain correct semantics', async () => {
  const originalFetch = globalThis.fetch
  const originalEvents = Object.getOwnPropertyDescriptor(globalThis, 'EventSource')
  const instances: FakeEvents[] = []
  class FakeEvents {
    onopen: (() => void) | null = null
    onerror: (() => void) | null = null
    onmessage: ((event: { data: string }) => void) | null = null
    constructor() { instances.push(this) }
    close() {}
  }
  Object.defineProperty(globalThis, 'EventSource', { configurable: true, value: FakeEvents })
  let fail = false
  globalThis.fetch = async input => fail ? new Response('', { status: 503 }) : response(Number(String(input).split('/').at(-1)))
  const states: TeamSourceState[] = []
  const stop = subscribeSaveTeam(state => states.push(state))
  const send = (snapshot: SaveSnapshot) => instances[0].onmessage!({ data: JSON.stringify(snapshot) })
  const snapshot: SaveSnapshot = { status: 'ready', message: 'ready', party: [parsePk5(pk5Fixture(502))], boxes: [], pokedex: { seenSpeciesIds: [572], caughtSpeciesIds: [572] }, updatedAt: '2026-10-03T00:00:00Z', backup: false }
  try {
    send(snapshot)
    await delay(15)
    const team = states.at(-1)!.team
    assert.equal(states.at(-1)!.collection!.length, 1)
    send({ ...snapshot, boxes: [boxed(572, 0, 0), boxed(572, 1, 0)] })
    await delay(15)
    assert.equal(states.at(-1)!.team, team)
    assert.equal(states.at(-1)!.collection!.length, 3)
    assert.equal(states.at(-1)!.pokedex!.caughtSpeciesIds.has(572), true)
    const valid = states.at(-1)!.collection
    send({ ...snapshot, status: 'error', party: null, boxes: null, message: 'busy' })
    assert.equal(states.at(-1)!.collection, valid)
    fail = true
    send({ ...snapshot, boxes: [boxed(573, 0, 0)] })
    await delay(15)
    assert.equal(states.at(-1)!.collectionError, true)
    assert.equal(states.at(-1)!.collection, valid)
    assert.equal(states.at(-1)!.team, team)
    fail = false
    send({ ...snapshot, boxes: [] })
    await delay(15)
    assert.equal(states.at(-1)!.collection!.length, 1)
    assert.equal(states.at(-1)!.pokedex!.caughtSpeciesIds.has(572), true)
    send({ ...snapshot, party: [], boxes: [] })
    await delay(15)
    assert.deepEqual(states.at(-1)!.collection, [])
    assert.deepEqual(states.at(-1)!.team, [])
    assert.equal(states.at(-1)!.pokedex!.caughtSpeciesIds.has(572), true)
  } finally {
    stop()
    globalThis.fetch = originalFetch
    if (originalEvents) Object.defineProperty(globalThis, 'EventSource', originalEvents)
    else Reflect.deleteProperty(globalThis, 'EventSource')
  }
})

test('outdated slow collection resolution cannot overwrite newer save state', async () => {
  const originalFetch = globalThis.fetch
  const originalEvents = Object.getOwnPropertyDescriptor(globalThis, 'EventSource')
  let send: ((data: string) => void) | undefined
  let complete: ((value: Response) => void) | undefined
  class FakeEvents {
    set onmessage(callback: (event: { data: string }) => void) { send = data => callback({ data }) }
    close() {}
  }
  Object.defineProperty(globalThis, 'EventSource', { configurable: true, value: FakeEvents })
  globalThis.fetch = async () => new Promise<Response>(resolve => { complete = resolve })
  const states: TeamSourceState[] = []
  const stop = subscribeSaveTeam(state => states.push(state))
  const snapshot: SaveSnapshot = { status: 'ready', message: 'ready', party: [], boxes: [boxed(572, 0, 0)], pokedex: null, updatedAt: null, backup: false }
  try {
    send!(JSON.stringify(snapshot))
    send!(JSON.stringify({ ...snapshot, boxes: [] }))
    await delay(10)
    assert.deepEqual(states.at(-1)!.collection, [])
    complete!(response(572))
    await delay(10)
    assert.deepEqual(states.at(-1)!.collection, [])
  } finally {
    stop()
    globalThis.fetch = originalFetch
    if (originalEvents) Object.defineProperty(globalThis, 'EventSource', originalEvents)
    else Reflect.deleteProperty(globalThis, 'EventSource')
  }
})
