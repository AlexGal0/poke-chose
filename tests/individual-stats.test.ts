import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { parsePk5, parseStoredPk5, parseSave } from '../bridge/parser.ts'
import { readParty } from '../bridge/live/party.mjs'
import { parseBoxes } from '../bridge/live/storage.mjs'
import { STATS } from '../src/domain/stats.ts'
import { boxesEqual, partiesEqual, isSaveSnapshot } from '../src/models/party.ts'
import type { SaveSnapshot } from '../src/models/party.ts'
import { resolveCollection, subscribeTeamSource } from '../src/sources/team.ts'
import type { TeamSourceState } from '../src/sources/team.ts'
import type { DataSourceEvent, PokemonDataSource } from '../src/sources/data-source.ts'
import { pk5Fixture, saveFixture } from './helpers/save-fixture.ts'

const individual = { natureId: 13, attack: 101, defense: 202, speed: 303, specialAttack: 404, specialDefense: 505 }
const fixture = (natureId = 13, attack = 101, shuffle = 9) => pk5Fixture(502, 25, shuffle, undefined,
  { currentHp: 0, maxHp: 606, experience: 15625 }, { ...individual, natureId, attack })
const snapshot = (): SaveSnapshot => ({ status: 'ready', message: 'ready', party: [parsePk5(fixture())], boxes: [], pokedex: null, updatedAt: '2026-10-07T23:00:00Z', backup: false })

test('all shuffle values preserve directly stored nature and six stats without changing the input', () => {
  for (let shuffle = 0; shuffle < 32; shuffle++) {
    const bytes = fixture(shuffle % 25, 101, shuffle)
    const before = Buffer.from(bytes)
    const member = parsePk5(bytes)
    assert.equal(member.natureId, shuffle % 25)
    assert.deepEqual(member.currentStats, { hp: 606, attack: 101, defense: 202, speed: 303, 'special-attack': 404, 'special-defense': 505 })
    assert.equal(member.currentHp, 0)
    assert.equal(member.maxHp, 606)
    assert.deepEqual(bytes, before)
  }
  assert.throws(() => parsePk5(fixture(25)), /Naturaleza/)
  assert.throws(() => parseStoredPk5(fixture(255).subarray(0, 136)), /Naturaleza/)
  assert.throws(() => parsePk5(pk5Fixture(502, 25, 9, undefined, { currentHp: 81, maxHp: 80, experience: 0 })), /PS/)
})

test('boxes retain nature but never read level or final stats from padding or adjacent slots', () => {
  const bytes = fixture().subarray(0, 136)
  const boxed = parseStoredPk5(bytes)!
  assert.equal(boxed.natureId, 13)
  for (const field of ['level', 'currentStats', 'currentHp', 'maxHp']) assert.equal(field in boxed, false)
  const memory = Buffer.alloc(23 * 4096 + 4080)
  bytes.copy(memory)
  fixture(24).subarray(0, 136).copy(memory, 136)
  const boxes = parseBoxes(memory, 4096)
  assert.deepEqual(boxes.map(member => member.natureId), [13, 24])
  assert.equal(boxesEqual(boxes, [{ ...boxes[0], natureId: 0 }, boxes[1]]), false)
  assert.equal(boxesEqual(boxes, structuredClone(boxes)), true)
})

test('new snapshots validate all fields and preserve missing legacy data instead of defaulting', () => {
  const next = snapshot()
  assert.equal(isSaveSnapshot(next), true)
  const member = next.party![0]
  const { currentStats, natureId, ...legacy } = member
  assert.ok(currentStats && natureId !== undefined)
  assert.equal(isSaveSnapshot({ ...next, party: [legacy] }), true)
  assert.equal('natureId' in legacy, false)
  assert.equal('currentStats' in legacy, false)
  for (const bad of [-1, 25, 0.5, null, '13']) assert.equal(isSaveSnapshot({ ...next, party: [{ ...member, natureId: bad }] }), false)
  for (const stat of STATS) {
    for (const bad of [-1, 65536, 1.5, null, '10', undefined]) {
      assert.equal(isSaveSnapshot({ ...next, party: [{ ...member, currentStats: { ...currentStats, [stat]: bad } }] }), false)
    }
  }
  assert.equal(isSaveSnapshot({ ...next, party: [{ ...member, currentStats: null }] }), false)
  assert.equal(isSaveSnapshot({ ...next, party: [{ ...member, maxHp: 605 }] }), false)
  assert.equal(partiesEqual([member], [legacy]), false)
  for (const stat of STATS) assert.equal(partiesEqual([member], [{ ...member, currentStats: { ...currentStats, [stat]: currentStats![stat] + 1 } }]), false)
  assert.equal(partiesEqual([member], [{ ...member, natureId: 0 }]), false)
})

test('live party reader uses the same direct fields and rejects changing memory', async () => {
  let bytes = fixture()
  let unstable = false
  let reads = 0
  const reader = { async readMemory(address: number) {
    if (address === 100) return Buffer.from([1, 0, 0, 0])
    const result = Buffer.from(bytes)
    if (unstable && ++reads % 2 === 0) result[150] ^= 1
    return result
  } }
  const config = { partyAddress: 200, partyCountAddress: 100, partyStride: 220 }
  assert.deepEqual(await readParty(reader, config), [parsePk5(bytes)])
  bytes = fixture(24, 999)
  assert.equal((await readParty(reader, config))[0].currentStats.attack, 999)
  assert.equal((await readParty(reader, config))[0].natureId, 24)
  unstable = true
  await assert.rejects(readParty(reader, config), /cambió/)
})

test('adapters preserve per-individual data, unknown box stats and stale values across both sources', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ id: 502, name: 'dewott', types: [{ slot: 1, type: { name: 'water' } }], past_types: [], sprites: { versions: { 'generation-v': { 'black-white': { front_default: null } } } } })))
  const party = parseSave(saveFixture([fixture(), fixture(24, 999)])).party
  const box = { ...parseStoredPk5(fixture(0).subarray(0, 136))!, box: 0, slot: 0 }
  const collection = await resolveCollection(party, [box], new AbortController().signal)
  assert.deepEqual(collection.slice(0, 2).map(p => p.currentStats?.attack), [101, 999])
  assert.deepEqual(collection.map(p => p.natureId), [13, 24, 0])
  assert.equal(new Set(collection.map(p => p.instanceKey)).size, 3)
  assert.equal(collection[2].currentStats, undefined)
  assert.equal(collection[2].level, null)
  for (const sourceId of ['save', 'live']) {
    let listener: (event: DataSourceEvent) => void = () => {}
    const source: PokemonDataSource = { id: sourceId, labelKey: sourceId, capabilities: { party: true, boxes: true, pokedex: false }, subscribe(notify) { listener = notify; return () => {} } }
    const states: TeamSourceState[] = []
    const stop = subscribeTeamSource(source, state => states.push(state))
    try {
      const next = { ...snapshot(), party, boxes: [box] }
      listener({ type: 'snapshot', snapshot: next })
      await delay(20)
      assert.equal(states.at(-1)!.team[1].currentStats!.attack, 999)
      const changed = [{ ...party[0], natureId: 1, currentStats: { ...party[0].currentStats!, defense: 777 } }, party[1]]
      listener({ type: 'snapshot', snapshot: { ...next, party: changed } })
      await delay(20)
      const latest = states.at(-1)!
      assert.equal(latest.team[0].currentStats!.defense, 777)
      assert.equal(latest.collection![0].natureId, 1)
      listener({ type: 'connection', connected: false, message: { raw: 'Disconnected' } })
      assert.equal(states.at(-1)!.connected, false)
      assert.equal(states.at(-1)!.error, true)
      assert.equal(states.at(-1)!.team, latest.team)
      listener({ type: 'snapshot', snapshot: { ...next, status: 'error', party: null, boxes: null } })
      assert.equal(states.at(-1)!.collection, latest.collection)
    } finally { stop() }
  }
})
