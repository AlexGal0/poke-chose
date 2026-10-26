import test from 'node:test'
import assert from 'node:assert/strict'
import { createLiveBridge } from '../bridge/live-server.mjs'
import { createEnemyServer } from '../experiments/melonds-live/enemy-server.mjs'
import { saveFixture, pk5Fixture } from './helpers/save-fixture.ts'
import { createLivePartySource } from '../src/sources/live-party-source.ts'
import { emptyLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
async function until(predicate: () => boolean | Promise<boolean>) {
  for (let i = 0; i < 200; i++) { if (await predicate()) return; await pause(10) }
  throw new Error('Recovery did not complete')
}

test('Black general reader recovers automatically after loss and stops retrying when paused', { timeout: 10000 }, async t => {
  const ram = saveFixture().subarray(0, 0x24000)
  let fail = false
  let connections = 0
  const bridge = createLiveBridge({ partyAddress: 0x02018e08, partyCountAddress: 0x02018e04, partyStride: 220, boxesAddress: 0x02000400, boxStride: 4096, pokedexAddress: 0x02021600, pollMs: 10, reconnectMs: 20 }, () => {
    const instance = { socket: { destroyed: false }, async connect() { connections++ }, close() { instance.socket.destroyed = true }, async readMemory(address: number, length: number) {
      if (fail) { instance.socket.destroyed = true; throw new Error('disconnected') }
      return Buffer.from(ram.subarray(address - 0x02000000, address - 0x02000000 + length))
    } }
    return instance
  })
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  const address = bridge.server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}/live-api`
  const abort = new AbortController()
  t.after(async () => { abort.abort(); await bridge.close() })
  const response = await fetch(`${base}/events`, { signal: abort.signal })
  const stream = response.body!.getReader()
  let latest: { status: string; message: string } | undefined
  void (async () => {
    let buffer = ''
    try { while (true) { const result = await stream.read(); if (result.done) break; buffer += new TextDecoder().decode(result.value); let end; while ((end = buffer.indexOf('\n\n')) >= 0) { const block = buffer.slice(0, end); buffer = buffer.slice(end + 2); const match = /^data: (.*)$/m.exec(block); if (match) latest = JSON.parse(match[1]) } } } catch { /* Test cleanup closes SSE. */ }
  })()
  const post = (action: string) => fetch(`${base}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal(connections, 0)
  await post('connect'); await until(() => latest?.status === 'ready')
  fail = true; await until(() => latest?.message === 'connectionLost')
  fail = false; await until(() => connections >= 2 && latest?.status === 'ready')
  await post('disconnect'); await until(() => latest?.message === 'paused')
  const stopped = connections
  await pause(90)
  assert.equal(connections, stopped)
})

test('Black battle reader retries failed handshakes and lost reads without another connect request', { timeout: 10000 }, async t => {
  let fail = true
  let connections = 0
  const bridge = createEnemyServer({ addresses: [0x02000100], pollMs: 10, reconnectMs: 20 }, () => {
    const instance = { socket: { destroyed: false }, async connect() { connections++; if (fail) throw new Error('offline') }, close() { instance.socket.destroyed = true }, async readMemory() { if (fail) { instance.socket.destroyed = true; throw new Error('lost') }; return pk5Fixture(568, 19) } }
    return instance
  })
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}/enemy-api`
  await assert.rejects(bridge.connect(), /offline/)
  fail = false
  await until(async () => connections >= 2 && (await (await fetch(`${base}/snapshot`)).json()).status === 'ready')
  fail = true
  await until(async () => (await (await fetch(`${base}/snapshot`)).json()).status === 'error')
  const before = connections; fail = false
  await until(async () => connections > before && (await (await fetch(`${base}/snapshot`)).json()).status === 'ready')
})

test('X restores opt-in after an SSE outage, but never reconnects after manual disconnect or unsubscribe', async () => {
  const calls: string[] = []
  const events = { onmessage: null as null | ((event: { data: string }) => void), onerror: null as null | (() => void), close() {} }
  const source = createLivePartySource(() => events, async url => { calls.push(String(url)); return new Response('{}') })
  const stop = source.subscribe(() => {})
  await source.control('connect')
  // A connecting frame is valid without a party and confirms that opt-in is active.
  const active = { ...emptyLivePartySnapshot(), enabled: true, message: 'connecting' }
  events.onmessage?.({ data: JSON.stringify(active) })
  events.onerror?.()
  events.onmessage?.({ data: JSON.stringify(emptyLivePartySnapshot()) })
  await pause(0)
  assert.equal(calls.filter(url => url === '/x-live-api/connect').length, 2)
  await source.control('disconnect')
  events.onerror?.()
  events.onmessage?.({ data: JSON.stringify(emptyLivePartySnapshot()) })
  await pause(0)
  assert.equal(calls.filter(url => url === '/x-live-api/connect').length, 2)
  await source.control('reconnect')
  assert.equal(calls.at(-1), '/x-live-api/reconnect')
  stop()
  events.onerror?.()
  events.onmessage?.({ data: JSON.stringify(emptyLivePartySnapshot()) })
  await pause(0)
  assert.equal(calls.filter(url => url === '/x-live-api/connect').length, 2)
})
