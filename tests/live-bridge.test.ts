import test from 'node:test'
import assert from 'node:assert/strict'
import { createLiveBridge } from '../bridge/live-server.mjs'
import { pk5Fixture, saveFixture } from './helpers/save-fixture.ts'

test('optional fast repel polling shares GDB, sends small events and can revert without reconnecting', { timeout: 12000 }, async t => {
  const ram = saveFixture().subarray(0, 0x24000)
  ram[0x21b31] = 200
  let connections = 0
  let pending = 0
  let maximumPending = 0
  let teamReads = 0
  const bridge = createLiveBridge({ partyAddress: 0x02018e08, partyCountAddress: 0x02018e04, partyStride: 220, boxesAddress: 0x02000400, boxStride: 4096, pokedexAddress: 0x02021600, repelStepsAddress: 0x02021b31, fastPollMs: 2000 }, () => {
    const reader = {
      socket: { destroyed: false },
      async connect() { connections++ },
      async readMemory(address: number, length: number) {
        pending++
        maximumPending = Math.max(maximumPending, pending)
        if (address === 0x02018e04) teamReads++
        await new Promise(resolve => setTimeout(resolve, 2))
        pending--
        return Buffer.from(ram.subarray(address - 0x02000000, address - 0x02000000 + length))
      },
      close() { reader.socket.destroyed = true },
    }
    return reader
  })
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  const controller = new AbortController()
  t.after(async () => { controller.abort(); await bridge.close() })
  const stream = (await fetch(url + '/live-api/events', { signal: controller.signal })).body!.getReader()
  let buffer = ''
  async function next() {
    while (!buffer.includes('\n\n')) buffer += Buffer.from((await stream.read()).value!).toString()
    const end = buffer.indexOf('\n\n')
    const entry = buffer.slice(0, end)
    buffer = buffer.slice(end + 2)
    return { kind: entry.startsWith('event: repel') ? 'repel' : 'snapshot', data: JSON.parse(entry.split('\n').find(line => line.startsWith('data: '))!.slice(6)) }
  }
  const post = (action: string, body: object = {}) => fetch(url + '/live-api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  await next()
  await post('connect')
  let event = await next()
  while (event.data.status !== 'ready') event = await next()
  assert.equal(event.data.repel, null, 'default fast mode starts with unavailable data')
  event = await next()
  assert.equal(event.kind, 'repel')
  assert.equal(event.data.steps, 200, 'default mode reads every 500 ms without enabling it')
  const initialTeamReads = teamReads
  assert.equal((await post('repel-poll', { intervalMs: 100 })).status, 400)
  assert.equal((await post('repel-poll', { intervalMs: 500 })).status, 200)
  ram[0x21b31] = 199
  event = await next()
  assert.equal(event.kind, 'repel')
  assert.equal(event.data.steps, 199)
  assert.equal(event.data.party, undefined)
  assert.equal(teamReads, initialTeamReads, 'fast sample does not reread the team')
  ram[0x21b31] = 0
  event = await next()
  assert.equal(event.kind, 'repel')
  assert.equal(event.data.steps, 0)
  assert.equal((await post('repel-poll', { intervalMs: null })).status, 200)
  event = await next()
  assert.equal(event.kind, 'snapshot', 'reverted mode stops the separate timer')
  assert.equal(event.data.repel.steps, 0)
  assert.equal(connections, 1)
  assert.equal(maximumPending, 1, 'all memory requests are serialized')
  await post('disconnect')
  do { event = await next() } while (event.data.message !== 'paused')
  const pausedReads = teamReads
  await post('repel-poll', { intervalMs: 500 })
  await new Promise(resolve => setTimeout(resolve, 650))
  assert.equal(teamReads, pausedReads)
})

test('live service waits for explicit connection, emits consistent data and preserves it after loss/reconnect', { timeout: 15000 }, async t => {
  const ram = saveFixture().subarray(0, 0x24000)
  let connections = 0
  let fail = false
  let unstablePosition = false
  let positionReads = 0
  let unstableRepel = false
  let repelReads = 0
  ram[0x21b31] = 250
  const instances: { socket: { destroyed: boolean }; close: () => void }[] = []
  const bridge = createLiveBridge({ partyAddress: 0x02018e08, partyCountAddress: 0x02018e04, partyStride: 220, boxesAddress: 0x02000400, boxStride: 4096, pokedexAddress: 0x02021600, mapAddress: 0x02019580, repelStepsAddress: 0x02021b31, repelPollMs: null, pollMs: 20, boxesPollMs: 20 }, () => {
    const instance = {
      socket: { destroyed: false },
      async connect() { connections++ },
      async readMemory(address: number, length: number) {
        if (fail) { instance.socket.destroyed = true; throw new Error('Disconnected') }
        if (address === 0x02021b31 && unstableRepel) return Buffer.from([++repelReads % 2 ? 173 : 172])
        if (address === 0x02019580 && unstablePosition) {
          const bytes = Buffer.alloc(length)
          bytes.writeUInt16LE(++positionReads, 0)
          return bytes
        }
        return Buffer.from(ram.subarray(address - 0x02000000, address - 0x02000000 + length))
      },
      close() { instance.socket.destroyed = true },
      async disconnect() { instance.close() },
    }
    instances.push(instance)
    return instance
  })
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  const controller = new AbortController()
  t.after(async () => { controller.abort(); await bridge.close() })
  const response = await fetch(url + '/live-api/events', { signal: controller.signal })
  const reader = response.body!.getReader()
  let buffer = ''
  async function next() {
    while (!buffer.includes('\n\n')) {
      const chunk = await reader.read()
      assert.equal(chunk.done, false)
      buffer += Buffer.from(chunk.value!).toString()
    }
    const end = buffer.indexOf('\n\n')
    const entry = buffer.slice(0, end)
    buffer = buffer.slice(end + 2)
    return JSON.parse(entry.slice(6))
  }
  async function until(status: string) {
    for (let i = 0; i < 20; i++) { const sample = await next(); if (sample.status === status) return sample }
    throw new Error('Expected status not received')
  }
  const initial = await next()
  assert.equal(initial.party, null)
  assert.equal(connections, 0)
  const denied = await fetch(url + '/live-api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: '{}' })
  assert.equal(denied.status, 403)
  assert.equal(connections, 0)
  const post = (action: string) => fetch(url + '/live-api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal((await post('connect')).status, 202)
  const ready = await until('ready')
  assert.equal(ready.party.length, 1)
  assert.equal(ready.party[0].natureId, 0)
  assert.deepEqual(ready.party[0].currentStats, { hp: 80, attack: 51, defense: 52, speed: 53, 'special-attack': 54, 'special-defense': 55 })
  assert.deepEqual(ready.boxes, [])
  assert.deepEqual(ready.pokedex.caughtSpeciesIds, [])
  assert.equal(ready.position.mapId, 0)
  assert.equal(ready.repel.steps, 250)
  ram[0x21b31] = 249
  let stepped = await until('ready')
  for (let i = 0; i < 20 && stepped.repel?.steps !== 249; i++) stepped = await until('ready')
  assert.equal(stepped.repel.steps, 249)
  unstableRepel = true
  let unavailableRepel = await until('ready')
  for (let i = 0; i < 20 && unavailableRepel.repel !== null; i++) unavailableRepel = await until('ready')
  assert.equal(unavailableRepel.repel, null)
  assert.deepEqual(unavailableRepel.party, ready.party, 'an unstable repel reading must not discard the team')
  unstableRepel = false
  ram[0x21b31] = 251
  let invalidRepel = await until('ready')
  for (let i = 0; i < 20 && invalidRepel.repel !== null; i++) invalidRepel = await until('ready')
  assert.equal(invalidRepel.repel, null)
  assert.deepEqual(invalidRepel.party, ready.party)
  ram[0x21b31] = 0
  let expiredRepel = await until('ready')
  for (let i = 0; i < 20 && expiredRepel.repel?.steps !== 0; i++) expiredRepel = await until('ready')
  assert.equal(expiredRepel.repel.steps, 0)
  ram[0x21b31] = 173
  ram.writeUInt32LE(331, 0x19580)
  let moved = await until('ready')
  for (let i = 0; i < 20 && moved.position?.mapId !== 331; i++) moved = await until('ready')
  assert.equal(moved.position.mapId, 331)
  assert.deepEqual(moved.party, ready.party)
  unstablePosition = true
  let unknown = await until('ready')
  for (let i = 0; i < 20 && unknown.position !== null; i++) unknown = await until('ready')
  assert.equal(unknown.position, null)
  assert.deepEqual(unknown.party, ready.party)
  unstablePosition = false
  const recoveredPosition = await until('ready')
  assert.equal(recoveredPosition.position.mapId, 331)
  fail = true
  const lost = await until('error')
  assert.deepEqual(lost.party, ready.party)
  assert.ok(lost.updatedAt)
  assert.equal(connections, 1)
  fail = false
  await post('connect')
  assert.equal((await until('ready')).party.length, 1)
  assert.equal(connections, 2)
  await post('disconnect')
  let paused = await until('waiting')
  if (paused.message === 'stopping') paused = await until('waiting')
  assert.equal(paused.party.length, 1)
  assert.equal(instances.at(-1)!.socket.destroyed, false)
  await post('connect')
  assert.equal((await until('ready')).party.length, 1)
  assert.equal(connections, 2, 'resume must reuse the existing GDB connection')
  // Simulate an intermediate deposit: the same individual still exists in both places.
  ram.copy(ram, 0x400, 0x18e08, 0x18e08 + 136)
  const unstable = await until('waiting')
  assert.equal(unstable.message, 'waitingUnstable')
  assert.deepEqual(unstable.boxes, [], 'do not publish a duplicate as a valid collection')
  ram.fill(0, 0x400, 0x400 + 136)
  assert.equal((await until('ready')).boxes.length, 0)
})

test('boxes refresh periodically or manually, without reads for party changes or caught flags', { timeout: 10000 }, async t => {
  const ram = saveFixture().subarray(0, 0x24000)
  let boxReads = 0
  const bridge = createLiveBridge({ partyAddress: 0x02018e08, partyCountAddress: 0x02018e04, partyStride: 220, boxesAddress: 0x02000400, boxStride: 4096, pokedexAddress: 0x02021600, fastPollMs: 10, boxesPollMs: 1000 }, () => ({
    socket: { destroyed: false },
    async connect() {},
    close() {},
    async readMemory(address: number, length: number) {
      if (address === 0x02000400) {
        boxReads++
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      return Buffer.from(ram.subarray(address - 0x02000000, address - 0x02000000 + length))
    },
  }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  const controller = new AbortController()
  t.after(async () => { controller.abort(); await bridge.close() })
  const response = await fetch(url + '/live-api/events', { signal: controller.signal })
  const stream = response.body!.getReader()
  let buffer = ''
  async function ready() {
    while (true) {
      while (!buffer.includes('\n\n')) {
        const chunk = await stream.read()
        assert.equal(chunk.done, false)
        buffer += Buffer.from(chunk.value!).toString()
      }
      const end = buffer.indexOf('\n\n')
      const entry = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      if (!entry.startsWith('data: ')) continue
      const sample = JSON.parse(entry.slice(6))
      if (sample.status === 'ready') return sample
    }
  }
  await fetch(url + '/live-api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  await ready()
  const firstReads = boxReads
  assert.equal(firstReads, 2, 'boxes are read twice for stability')
  for (let i = 0; i < 3; i++) await ready()
  assert.equal(boxReads, firstReads, 'fast samples must avoid the large box read')
  // Transfer the old party member to PC and replace it with another individual.
  ram.copy(ram, 0x400, 0x18e08, 0x18e08 + 136)
  pk5Fixture(507, 24, 10).copy(ram, 0x18e08)
  let transferred = await ready()
  while (transferred.party[0].speciesId !== 507) transferred = await ready()
  assert.equal(transferred.boxes.length, 0, 'PC changes wait for periodic or manual refresh')
  assert.equal(boxReads, firstReads, 'party membership must not force a large read')
  ram[0x21608] = 1
  let caught = await ready()
  while (!caught.pokedex.caughtSpeciesIds.includes(1)) caught = await ready()
  assert.equal(boxReads, firstReads, 'new caught flags must not force a box refresh')
  const post = (action: string, origin?: string) => fetch(url + '/live-api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: '{}' })
  assert.equal((await post('refresh-boxes', 'https://example.com')).status, 403)
  assert.equal(boxReads, firstReads)
  const manualRequests = await Promise.all([post('refresh-boxes'), post('refresh-boxes')])
  assert.deepEqual(manualRequests.map(response => response.status), [200, 200])
  assert.equal(boxReads, firstReads + 2, 'concurrent requests share one stable box read')
  let refreshed = await ready()
  while (refreshed.boxes.length !== 1) refreshed = await ready()
  assert.equal(refreshed.boxes[0].speciesId, 502)
  // Withdraw an individual still present in the cached PC: publish the new party
  // and omit its outdated box location without rereading RAM for the boxes.
  ram.fill(0, 0x400, 0x400 + 136)
  pk5Fixture().copy(ram, 0x18e08)
  let withdrawn = await ready()
  while (withdrawn.party[0].speciesId !== 502) withdrawn = await ready()
  assert.deepEqual(withdrawn.boxes, [])
  assert.equal(boxReads, firstReads + 2, 'cached PC overlap must not stall the team or force reads')
  const beforePeriodic = boxReads
  while (boxReads === beforePeriodic) await ready()
  assert.equal(boxReads, beforePeriodic + 2, 'unchanged boxes still refresh on their own interval')
  await post('disconnect')
  // Let the serialized pause complete before checking that refresh cannot resume it.
  assert.equal((await post('refresh-boxes')).status, 503)
})

test('failed box reads preserve the fast team updates and wait until manual retry', { timeout: 10000 }, async t => {
  const ram = saveFixture().subarray(0, 0x24000)
  let boxReads = 0
  let corrupt = true
  const bridge = createLiveBridge({ partyAddress: 0x02018e08, partyCountAddress: 0x02018e04, partyStride: 220, boxesAddress: 0x02000400, boxStride: 4096, pokedexAddress: 0x02021600, fastPollMs: 10 }, () => ({
    socket: { destroyed: false }, async connect() {}, close() {},
    async readMemory(address: number, length: number) {
      if (address === 0x02000400) { boxReads++; if (corrupt) throw new Error('Caja corrupta') }
      return Buffer.from(ram.subarray(address - 0x02000000, address - 0x02000000 + length))
    },
  }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  const controller = new AbortController()
  t.after(async () => { controller.abort(); await bridge.close() })
  const response = await fetch(url + '/live-api/events', { signal: controller.signal })
  const stream = response.body!.getReader()
  let buffer = ''
  async function nextReady() {
    while (true) {
      while (!buffer.includes('\n\n')) buffer += Buffer.from((await stream.read()).value!).toString()
      const end = buffer.indexOf('\n\n')
      const entry = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      if (entry.startsWith('data: ')) { const sample = JSON.parse(entry.slice(6)); if (sample.status === 'ready') return sample }
    }
  }
  const post = (action: string) => fetch(url + '/live-api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  await post('connect')
  const first = await nextReady()
  assert.equal(first.party[0].speciesId, 502)
  assert.equal(first.boxes, null)
  assert.equal(first.message, 'readyBoxesFailed')
  for (let index = 0; index < 3; index++) await nextReady()
  assert.equal(boxReads, 1, 'failure must not retry the boxes at every fast poll')
  assert.equal((await post('refresh-boxes')).status, 503)
  assert.equal(boxReads, 2)
  corrupt = false
  assert.equal((await post('refresh-boxes')).status, 200)
  assert.equal(boxReads, 4)
  let recovered = await nextReady()
  while (recovered.boxes === null) recovered = await nextReady()
  assert.deepEqual(recovered.boxes, [])
})
