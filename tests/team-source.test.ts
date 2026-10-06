import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { initialSaveTeam, manualTeam, resolveParty, subscribeSaveTeam, subscribeTeamSource } from '../src/sources/team.ts'
import type { DataSourceEvent, PokemonDataSource } from '../src/sources/data-source.ts'
import type { TeamSourceState } from '../src/sources/team.ts'
import { getSavePokemon } from '../src/api/pokeapi.ts'
import { isSaveSnapshot } from '../src/models/party.ts'
import type { SaveSnapshot } from '../src/models/party.ts'
import { parseSave } from '../bridge/parser.ts'
import { pk5Fixture, saveFixture } from './helpers/save-fixture.ts'

function apiResponse(id: number, name = 'dewott', types = ['water']) {
  return { id, name, types: types.map((type, index) => ({ slot: index + 1, type: { name: type } })), past_types: [], sprites: { versions: { 'generation-v': { 'black-white': { front_default: null } } } } }
}

test('independent datasource supports party-only snapshots without inventing collection or dex data', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify(apiResponse(498, 'tepig', ['fire'])))
  let listener: (event: DataSourceEvent) => void = () => {}
  let unsubscribed = false
  const source: PokemonDataSource = {
    id: 'test-live', label: 'Test live', capabilities: { party: true, boxes: false, pokedex: false },
    subscribe(notify) { listener = notify; return () => { unsubscribed = true } },
  }
  const states: TeamSourceState[] = []
  const stop = subscribeTeamSource(source, state => states.push(state))
  const snapshot: SaveSnapshot = { status: 'ready', message: 'live', party: parseSave(saveFixture()).party, boxes: null, pokedex: null, updatedAt: '2026-10-04T00:00:00Z', backup: false }
  try {
    listener({ type: 'snapshot', snapshot })
    listener({ type: 'connection', connected: false, message: 'Disconnected during hydration' })
    await delay(15)
    assert.equal(states.at(-1)!.team.length, 1)
    assert.equal(states.at(-1)!.collection, null)
    assert.equal(states.at(-1)!.pokedex, null)
    assert.equal(states.at(-1)!.connected, false)
    assert.equal(states.at(-1)!.error, true)
    assert.equal(states.at(-1)!.message, 'Disconnected during hydration')
    listener({ type: 'snapshot', snapshot: { ...snapshot, status: 'waiting', message: 'Reader stopped' }, connected: false })
    assert.equal(states.at(-1)!.connected, false)
    assert.equal(states.at(-1)!.error, true)
    listener({ type: 'connection', connected: false, message: 'Reconnect manually' })
    assert.equal(states.at(-1)!.connected, false)
    assert.equal(states.at(-1)!.team.length, 1)
    stop()
    const count = states.length
    listener({ type: 'snapshot', snapshot })
    assert.equal(states.length, count)
    assert.equal(unsubscribed, true)
    const isolated: TeamSourceState[] = []
    const stopOther = subscribeTeamSource(source, state => isolated.push(state), initialSaveTeam)
    listener({ type: 'connection', connected: true, message: 'New source' })
    assert.equal(isolated.at(-1)!.team.length, 0)
    stopOther()
  } finally { stop(); globalThis.fetch = original }
})

test('save adapter resolves static data once per species/form and preserves duplicate individuals', async () => {
  const original = globalThis.fetch
  let requests = 0
  globalThis.fetch = async () => { requests++; return new Response(JSON.stringify(apiResponse(502))) }
  try {
    const party = parseSave(saveFixture([pk5Fixture(502, 20, 9, { text: 'Azul' }), pk5Fixture(502, 30, 9, { text: 'Mar' })])).party
    const result = await resolveParty(party, new AbortController().signal)
    assert.equal(requests, 1)
    assert.deepEqual(result.map(p => [p.id, p.name, p.level, p.types]), [[502, 'dewott', 20, ['water']], [502, 'dewott', 30, ['water']]])
    assert.notEqual(result[0].instanceKey, result[1].instanceKey)
    assert.deepEqual(result.map(member => member.nickname), ['Azul', 'Mar'])
    const manual = { collection: [{ id: 502, name: 'dewott', types: ['water'] as const, sprite: null }], teamIds: [502] }
    assert.equal(manualTeam({ ...manual, collection: [{ ...manual.collection[0], types: ['water'] }] })[0].id, 502)
  } finally { globalThis.fetch = original }
})

test('Rotom form uses PokéAPI variety; Arceus form uses Gen V type order', async () => {
  const original = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = async input => {
    urls.push(String(input))
    return new Response(JSON.stringify(String(input).includes('rotom-wash') ? apiResponse(10009, 'rotom-wash', ['electric', 'water']) : apiResponse(493, 'arceus', ['normal'])))
  }
  try {
    const rotom = await getSavePokemon(479, 2)
    assert.deepEqual(rotom.types, ['electric', 'water'])
    assert.equal(rotom.id, 479)
    assert.ok(urls[0].endsWith('/pokemon/rotom-wash'))
    assert.deepEqual((await getSavePokemon(493, 16)).types, ['dark'])
    await assert.rejects(getSavePokemon(493, 17))
  } finally { globalThis.fetch = original }
})

test('SSE adapter updates metadata, retains last valid party on errors, ignores invalid data and closes connection', async () => {
  const originalFetch = globalThis.fetch
  const originalEvents = Object.getOwnPropertyDescriptor(globalThis, 'EventSource')
  const instances: FakeEvents[] = []
  class FakeEvents {
    onopen: (() => void) | null = null
    onerror: (() => void) | null = null
    onmessage: ((event: { data: string }) => void) | null = null
    closed = false
    constructor() { instances.push(this) }
    close() { this.closed = true }
  }
  Object.defineProperty(globalThis, 'EventSource', { configurable: true, value: FakeEvents })
  globalThis.fetch = async () => new Response(JSON.stringify(apiResponse(502)))
  const states: TeamSourceState[] = []
  const stop = subscribeSaveTeam(state => states.push(state))
  const fake = instances[0]
  const party = parseSave(saveFixture()).party
  const snapshot: SaveSnapshot = { status: 'ready', message: 'ready', party, boxes: [], pokedex: { seenSpeciesIds: [498], caughtSpeciesIds: [] }, updatedAt: '2026-10-03T00:00:00Z', backup: false }
  try {
    fake!.onopen!()
    fake!.onmessage!({ data: JSON.stringify(snapshot) })
    await delay(15)
    assert.equal(states.at(-1)!.team[0].level, 25)
    fake!.onmessage!({ data: JSON.stringify({ ...snapshot, pokedex: { seenSpeciesIds: [498], caughtSpeciesIds: [498] } }) })
    assert.equal(states.at(-1)!.pokedex!.caughtSpeciesIds.has(498), true)
    assert.equal(states.at(-1)!.team[0].level, 25)
    fake!.onmessage!({ data: JSON.stringify({ ...snapshot, status: 'error', message: 'locked' }) })
    assert.equal(states.at(-1)!.team[0].level, 25)
    fake!.onerror!()
    assert.equal(states.at(-1)!.connected, false)
    assert.equal(states.at(-1)!.team.length, 1)
    fake!.onmessage!({ data: 'null' })
    assert.equal(states.at(-1)!.error, true)
    assert.equal(states.at(-1)!.team.length, 1)
    fake!.onmessage!({ data: JSON.stringify({ ...snapshot, party: [{ ...party[0], level: 26 }] }) })
    await delay(15)
    assert.equal(states.at(-1)!.team[0].level, 26)
    assert.equal(isSaveSnapshot({ ...snapshot, party: [{ ...party[0], speciesId: 999 }] }), false)
    stop()
    assert.equal(fake!.closed, true)
  } finally {
    stop()
    globalThis.fetch = originalFetch
    if (originalEvents) Object.defineProperty(globalThis, 'EventSource', originalEvents)
    else Reflect.deleteProperty(globalThis, 'EventSource')
  }
})
