import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRepelSteps } from '../bridge/repel.ts'
import { readRepel } from '../bridge/live/repel.mjs'
import { isRepelReading } from '../src/models/repel.ts'
import { isSaveSnapshot } from '../src/models/party.ts'
import { initialSaveTeam, subscribeTeamSource } from '../src/sources/team.ts'
import type { DataSourceEvent, PokemonDataSource } from '../src/sources/data-source.ts'
import type { TeamSourceState } from '../src/sources/team.ts'
import { repelReadingStale } from '../src/domain/repel.ts'

test('repel bytes distinguish confirmed zero from invalid or missing data', () => {
  for (const steps of [0, 1, 100, 173, 200, 250]) assert.equal(parseRepelSteps(Uint8Array.of(steps)), steps)
  for (const bytes of [new Uint8Array(), Uint8Array.of(251), Uint8Array.of(255), Uint8Array.of(173, 0)]) assert.throws(() => parseRepelSteps(bytes))
  const updatedAt = '2026-10-10T01:59:08Z'
  assert.equal(isRepelReading({ steps: 173, updatedAt }), true)
  for (const reading of [null, {}, { steps: -1, updatedAt }, { steps: 251, updatedAt }, { steps: 1.5, updatedAt }, { steps: '173', updatedAt }, { steps: 173, updatedAt: 'invalid' }]) assert.equal(isRepelReading(reading), false)
})

test('repel freshness expires without inventing a countdown', () => {
  const reading = { steps: 173, updatedAt: '2026-10-10T01:59:08Z' }
  const now = Date.parse(reading.updatedAt)
  assert.equal(repelReadingStale(reading, false, now + 10000), false)
  assert.equal(repelReadingStale(reading, false, now + 10001), true)
  assert.equal(repelReadingStale(reading, true, now), true)
  assert.equal(reading.steps, 173)
})

test('repel reader is opt-in, reads only two bytes and rejects changed/invalid samples', async () => {
  let calls = 0
  let values = [173, 173]
  const reader = { async readMemory(address: number, length: number) {
    assert.equal(address, 0x0223d69d)
    assert.equal(length, 1)
    calls++
    return Buffer.from(values.splice(0, 1))
  } }
  assert.equal(await readRepel(reader, {}), null)
  assert.equal(await readRepel(reader, { repelStepsAddress: null }), null)
  assert.equal(calls, 0)
  const config = { repelStepsAddress: '0x0223d69d' }
  const reading = await readRepel(reader, config)
  assert.equal(reading.steps, 173)
  assert.equal(isRepelReading(reading), true)
  assert.equal(calls, 2)
  values = [0, 0]
  assert.equal((await readRepel(reader, config)).steps, 0)
  values = [173, 172]
  await assert.rejects(readRepel(reader, config))
  values = [251, 251]
  await assert.rejects(readRepel(reader, config))
  for (const address of ['bad', 0x01ffffff, 0x02400000, 0x0223d69d + 0.5]) await assert.rejects(readRepel(reader, { repelStepsAddress: address }))
})

test('repel adapter retains stale readings on loss/unavailable data and clears only with fresh zero', () => {
  let notify: (event: DataSourceEvent) => void = () => {}
  const source: PokemonDataSource = { id: 'live', labelKey: 'sources.live.label', capabilities: { party: false, boxes: false, pokedex: false, repel: true }, subscribe(listener) { notify = listener; return () => {} } }
  let state: TeamSourceState = initialSaveTeam
  const stop = subscribeTeamSource(source, next => { state = next })
  const updatedAt = '2026-10-10T01:59:08Z'
  const base = { status: 'ready', message: 'readyActive', party: null, boxes: null, pokedex: null, updatedAt, backup: false }
  const send = (patch: object = {}) => notify({ type: 'snapshot', snapshot: { ...base, ...patch }, connected: true })
  try {
    assert.equal(isSaveSnapshot(base), true, 'old bridges remain compatible')
    send({ repel: { steps: 250, updatedAt } })
    assert.equal(state.repel?.steps, 250)
    assert.equal(state.repelStale, false)
    notify({ type: 'connection', connected: false, message: { key: 'sources.live.disconnected' } })
    assert.equal(state.repel?.steps, 250)
    assert.equal(state.repelStale, true)
    send({ repel: null })
    assert.equal(state.repel?.steps, 250)
    assert.equal(state.repelStale, true)
    send({ repel: { steps: 173, updatedAt } })
    assert.equal(state.repel?.steps, 173)
    assert.equal(state.repelStale, false)
    notify({ type: 'repel', reading: { steps: 172, updatedAt } })
    assert.equal(state.repel?.steps, 172)
    notify({ type: 'repel', reading: null })
    assert.equal(state.repel?.steps, 172)
    assert.equal(state.repelStale, true)
    send({ repel: { steps: 173, updatedAt } })
    send({ status: 'waiting', repel: { steps: 0, updatedAt } })
    assert.equal(state.repel?.steps, 173)
    assert.equal(state.repelStale, true)
    send({ repel: { steps: 251, updatedAt } })
    assert.equal(state.repel?.steps, 173)
    assert.equal(state.repelStale, true)
    send({ repel: { steps: 0, updatedAt } })
    assert.equal(state.repel?.steps, 0)
    assert.equal(state.repelStale, false)
    send()
    assert.equal(state.repel?.steps, 0)
    assert.equal(state.repelStale, true)
  } finally { stop() }
})
