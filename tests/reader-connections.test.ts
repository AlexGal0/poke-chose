import test from 'node:test'
import assert from 'node:assert/strict'
import { connectReaders } from '../src/sources/reader-control.ts'
import { readerStatus } from '../src/domain/reader-status.ts'
import { readerStatusLabel } from '../src/i18n/reader-status.ts'
import i18n from '../src/i18n/index.ts'

test('one action starts both connections and publishes each completion independently', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  const release = new Map<string, (response: Response) => void>()
  const completed: string[] = []
  globalThis.fetch = (input, options) => {
    const url = String(input)
    calls.push(url)
    assert.equal(options?.method, 'POST')
    assert.ok(options?.signal)
    return new Promise(resolve => release.set(url, resolve))
  }
  try {
    const pending = connectReaders(result => completed.push(result.reader))
    assert.deepEqual(calls, ['/live-api/connect', '/enemy-api/connect'])
    release.get('/enemy-api/connect')!(new Response('{}'))
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(completed, ['battle'])
    release.get('/live-api/connect')!(new Response('{}'))
    const results = await pending
    assert.ok(results.every(result => result.error === null))
    assert.deepEqual(completed, ['battle', 'general'])
  } finally { globalThis.fetch = original }
})

test('either reader may fail without blocking the other, and a subsequent action retries both', async () => {
  const original = globalThis.fetch
  try {
    for (const broken of ['/live-api/connect', '/enemy-api/connect']) {
      globalThis.fetch = async input => new Response('{}', { status: String(input) === broken ? 503 : 200 })
      const results = await connectReaders()
      assert.ok(results.find(result => result.reader === (broken.includes('live') ? 'general' : 'battle'))!.error instanceof Error)
      assert.equal(results.find(result => result.reader === (broken.includes('live') ? 'battle' : 'general'))!.error, null)
    }
    globalThis.fetch = async () => { throw new Error('network unavailable') }
    assert.ok((await connectReaders()).every(result => result.error instanceof Error))
    globalThis.fetch = async () => new Response('{}')
    assert.ok((await connectReaders()).every(result => result.error === null))
  } finally { globalThis.fetch = original }
})

test('reader badges distinguish connecting, ready without a battle, waiting, disconnected and paused', () => {
  assert.equal(readerStatus({ connected: true, connecting: true, error: false }), 'connecting')
  assert.equal(readerStatus({ connected: true, connecting: false, error: false }), 'connected')
  assert.equal(readerStatus({ connected: false, connecting: false, error: false }), 'waiting')
  assert.equal(readerStatus({ connected: false, connecting: false, error: true }), 'disconnected')
  assert.equal(readerStatus({ connected: true, connecting: false, error: false, paused: true }), 'paused')
  for (const locale of ['es', 'en']) {
    for (const status of ['connected', 'connecting', 'waiting', 'disconnected', 'paused'] as const) {
      assert.notEqual(readerStatusLabel(i18n.getFixedT(locale), status), `readerConnections.status.${status}`)
    }
  }
})
