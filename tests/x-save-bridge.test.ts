import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, stat, unlink, rename, rm, mkdir } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { readStableFile } from '../bridge/stable-file.ts'
import { PokedexWatcher } from '../bridge/pokedex-watcher.ts'
import { createPokedexBridge } from '../bridge/pokedex-server.ts'
import { xSavePokedexReader } from '../src/games/x/save-pokedex.ts'
import { xPokedexFixture } from './helpers/x-pokedex-fixture.ts'
import { discoveredSpecies } from '../src/domain/discovery.ts'
import { deserializePokedex } from '../src/models/pokedex.ts'
import { request } from 'node:http'

async function eventually(predicate: () => boolean) {
  const end = Date.now() + 5000
  while (!predicate()) { if (Date.now() > end) throw new Error('Watcher timeout'); await delay(10) }
}
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'poke-chose-x-test-'))
  return { directory, path: join(directory, 'main'), cleanup: async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()))
    assert.ok(directory.includes('poke-chose-x-test-'))
    await rm(directory, { recursive: true, force: true })
  } }
}
const options = { debounceMs: 15, retryMs: [15], recoveryMs: 40, read: (path: string, size: number) => readStableFile(path, size, 2) }

test('stable X reads preserve bytes/mtime and reject absent, partial and changing synthetic files', async () => {
  const temporary = await fixture()
  try {
    await assert.rejects(readStableFile(temporary.path, xSavePokedexReader.byteLength, 1))
    await writeFile(temporary.path, Buffer.alloc(4))
    await assert.rejects(readStableFile(temporary.path, xSavePokedexReader.byteLength, 1))
    const bytes = xPokedexFixture({ caught: [659], seen: [[13]] })
    await writeFile(temporary.path, bytes)
    const before = await stat(temporary.path)
    assert.deepEqual(await readStableFile(temporary.path, bytes.length, 2), bytes)
    assert.equal((await stat(temporary.path)).mtimeMs, before.mtimeMs)
    const read = readStableFile(temporary.path, bytes.length, 100)
    await delay(40)
    await writeFile(temporary.path, xPokedexFixture({ caught: [13] }))
    await assert.rejects(read)
  } finally { await temporary.cleanup() }
})

test('X watcher refreshes on atomic replacement, retains valid discovery across corruption/deletion and recovers', async () => {
  const temporary = await fixture()
  const watcher = new PokedexWatcher(temporary.path, 'x-save', xSavePokedexReader, () => {}, options)
  try {
    const bytes = xPokedexFixture({ caught: [659], seen: [[13]] })
    await writeFile(temporary.path, bytes)
    watcher.start()
    await eventually(() => watcher.snapshot.status === 'ready')
    const valid = structuredClone(watcher.snapshot)
    assert.deepEqual([...discoveredSpecies(deserializePokedex(valid.pokedex!))].sort((a, b) => a - b), [13, 659])
    const corrupt = Buffer.from(bytes)
    corrupt[0x15008] ^= 1
    await writeFile(temporary.path, corrupt)
    await eventually(() => watcher.snapshot.status === 'error')
    assert.deepEqual(watcher.snapshot.pokedex, valid.pokedex)
    assert.equal(watcher.snapshot.updatedAt, valid.updatedAt)
    await unlink(temporary.path)
    await eventually(() => watcher.snapshot.status === 'missing')
    assert.deepEqual(watcher.snapshot.pokedex, valid.pokedex)
    const replacement = join(temporary.directory, 'replacement')
    await writeFile(replacement, xPokedexFixture({ caught: [13, 659, 721] }))
    await rename(replacement, temporary.path)
    await eventually(() => watcher.snapshot.status === 'ready' && watcher.snapshot.pokedex!.caughtSpeciesIds.includes(721))
    assert.deepEqual(watcher.snapshot.pokedex!.caughtSpeciesIds, [13, 659, 721])
    const unchanged = await readFile(temporary.path)
    await delay(80)
    assert.deepEqual(await readFile(temporary.path), unchanged)
  } finally { watcher.stop(); await temporary.cleanup() }
})

test('X watcher recovers a missing parent directory and ignores a read completed after stop', async () => {
  const temporary = await fixture()
  const path = join(temporary.directory, 'later', 'main')
  const watcher = new PokedexWatcher(path, 'x-save', xSavePokedexReader, () => {}, options)
  let release: ((bytes: Buffer) => void) | undefined
  let calls = 0
  const delayed = new PokedexWatcher(temporary.path, 'x-save', xSavePokedexReader, () => { calls++ }, { ...options, read: () => new Promise(resolve => { release = resolve }) })
  try {
    watcher.start()
    await eventually(() => watcher.snapshot.status === 'missing')
    await mkdir(dirname(path))
    await writeFile(path, xPokedexFixture())
    await eventually(() => watcher.snapshot.status === 'ready')
    delayed.start()
    await eventually(() => release !== undefined)
    delayed.stop()
    release!(xPokedexFixture())
    await delay(30)
    assert.equal(calls, 0)
  } finally { watcher.stop(); delayed.stop(); await temporary.cleanup() }
})

test('X SSE server publishes automatic updates; only local GET endpoints are exposed', async () => {
  const temporary = await fixture()
  await writeFile(temporary.path, xPokedexFixture({ caught: [13] }))
  const bridge = createPokedexBridge(temporary.path, 'x-save', xSavePokedexReader, options)
  const controller = new AbortController()
  try {
    await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
    const address = bridge.server.address()
    assert.ok(address && typeof address === 'object')
    const base = `http://127.0.0.1:${address.port}/x-save-api`
    const health = await (await fetch(`${base}/health`)).json()
    assert.equal(health.service, 'x-save')
    assert.equal((await fetch(`${base}/events`, { method: 'POST' })).status, 404)
    assert.equal((await fetch(`${base}/events`, { headers: { Origin: 'https://remote.invalid' } })).status, 403)
    const remoteHost = await new Promise<number>((resolve, reject) => {
      const req = request(`${base}/health`, { headers: { Host: 'remote.invalid' } }, response => { response.resume(); resolve(response.statusCode!) })
      req.on('error', reject)
      req.end()
    })
    assert.equal(remoteHost, 403)
    const response = await fetch(`${base}/events`, { signal: controller.signal })
    assert.match(response.headers.get('content-type')!, /text\/event-stream/)
    assert.equal(response.headers.get('access-control-allow-origin'), null)
    const reader = response.body!.getReader()
    let output = ''
    async function until(predicate: () => boolean) {
      const timeout = setTimeout(() => controller.abort(), 5000)
      try { while (!predicate()) { const chunk = await reader.read(); assert.equal(chunk.done, false); output += Buffer.from(chunk.value).toString('utf8') } }
      finally { clearTimeout(timeout) }
    }
    await until(() => output.includes('"caughtSpeciesIds":[13]'))
    await writeFile(temporary.path, xPokedexFixture({ caught: [13, 721] }))
    await until(() => output.includes('"caughtSpeciesIds":[13,721]'))
    assert.ok(!output.includes(temporary.path))
    controller.abort()
  } finally { controller.abort(); await bridge.close(); await temporary.cleanup() }
})
