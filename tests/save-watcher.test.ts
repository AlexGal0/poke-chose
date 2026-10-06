import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rename, unlink, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { SaveWatcher } from '../bridge/watcher.ts'
import { readStableSave } from '../bridge/read-save.ts'
import { createSaveBridge } from '../bridge/server.ts'
import type { SaveSnapshot } from '../src/models/party.ts'
import { pk5Fixture, saveFixture, refreshFixtureChecksums } from './helpers/save-fixture.ts'

async function eventually(predicate: () => boolean, timeout = 4000) {
  const end = Date.now() + timeout
  while (!predicate()) {
    if (Date.now() > end) throw new Error('Timed out waiting for watcher')
    await delay(15)
  }
}

async function temporarySave() {
  const directory = await mkdtemp(join(tmpdir(), 'poke-chose-test-'))
  const path = join(directory, 'test.sav')
  return { directory, path, cleanup: async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()))
    assert.ok(directory.includes('poke-chose-test-'))
    await rm(directory, { recursive: true, force: true })
  } }
}

const options = { debounceMs: 40, retryMs: [30, 60], recoveryMs: 100, read: (path: string) => readStableSave(path, 10), log: () => {} }

test('watcher emits nickname-only changes in party and boxes while keeping dex unchanged', async () => {
  const temporary = await temporarySave()
  const watcher = new SaveWatcher(temporary.path, () => {}, options)
  const bytes = saveFixture([pk5Fixture(502, 25, 9, { text: 'Azul' })])
  pk5Fixture(502, 25, 9, { text: 'Mar' }).subarray(0, 136).copy(bytes, 0x400)
  refreshFixtureChecksums(bytes)
  try {
    await writeFile(temporary.path, bytes)
    watcher.start()
    await eventually(() => watcher.snapshot.status === 'ready')
    const dex = watcher.snapshot.pokedex
    pk5Fixture(502, 25, 9, { text: 'AZUL' }).copy(bytes, 0x18e08)
    refreshFixtureChecksums(bytes)
    await writeFile(temporary.path, bytes)
    await eventually(() => watcher.snapshot.party?.[0].nickname === 'AZUL')
    assert.equal(watcher.snapshot.pokedex, dex)
    pk5Fixture(502, 25, 9, { text: 'Océano' }).subarray(0, 136).copy(bytes, 0x400)
    refreshFixtureChecksums(bytes)
    await writeFile(temporary.path, bytes)
    await eventually(() => watcher.snapshot.boxes?.[0].nickname === 'Océano')
    assert.equal(watcher.snapshot.party![0].nickname, 'AZUL')
    assert.equal(watcher.snapshot.pokedex, dex)
  } finally { watcher.stop(); await temporary.cleanup() }
})

test('box-only changes emit automatically, identical saves are suppressed and corrupt boxes preserve last collection', async () => {
  const temporary = await temporarySave()
  const snapshots: SaveSnapshot[] = []
  const watcher = new SaveWatcher(temporary.path, snapshot => snapshots.push(snapshot), options)
  const bytes = saveFixture()
  try {
    await writeFile(temporary.path, bytes)
    watcher.start()
    await eventually(() => watcher.snapshot.status === 'ready')
    const party = watcher.snapshot.party
    const dex = watcher.snapshot.pokedex
    const first = snapshots.length
    pk5Fixture(572).subarray(0, 136).copy(bytes, 0x400)
    refreshFixtureChecksums(bytes)
    await writeFile(temporary.path, bytes)
    await eventually(() => watcher.snapshot.boxes?.length === 1)
    assert.equal(snapshots.length, first + 1)
    assert.equal(watcher.snapshot.party, party)
    assert.equal(watcher.snapshot.pokedex, dex)
    assert.equal(watcher.snapshot.boxes![0].speciesId, 572)
    await writeFile(temporary.path, bytes)
    await delay(180)
    assert.equal(snapshots.length, first + 1)
    bytes[0x13f2] ^= 1
    await writeFile(temporary.path, bytes)
    await eventually(() => watcher.snapshot.status === 'error')
    assert.equal(watcher.snapshot.boxes![0].speciesId, 572)
    // Releasing a physical specimen removes it without changing the caught flags.
    bytes.fill(0, 0x400, 0x400 + 136)
    refreshFixtureChecksums(bytes)
    await writeFile(temporary.path, bytes)
    await eventually(() => watcher.snapshot.status === 'ready' && watcher.snapshot.boxes?.length === 0)
    assert.equal(watcher.snapshot.pokedex, dex)
  } finally { watcher.stop(); await temporary.cleanup() }
})

test('watcher emits caught-only changes with identical party and preserves last valid dex on failure', async () => {
  const temporary = await temporarySave()
  const snapshots: SaveSnapshot[] = []
  const watcher = new SaveWatcher(temporary.path, snapshot => snapshots.push(snapshot), options)
  const bytes = saveFixture()
  try {
    await writeFile(temporary.path, bytes)
    watcher.start()
    await eventually(() => watcher.snapshot.status === 'ready')
    const party = watcher.snapshot.party
    const first = snapshots.length
    const bit = 522 - 1
    bytes[0x21608 + Math.floor(bit / 8)] |= 1 << (bit % 8)
    bytes[0x2165c + Math.floor(bit / 8)] |= 1 << (bit % 8)
    refreshFixtureChecksums(bytes)
    await writeFile(temporary.path, bytes)
    await eventually(() => watcher.snapshot.pokedex?.caughtSpeciesIds.includes(522) === true)
    assert.equal(watcher.snapshot.party, party)
    assert.equal(snapshots.length, first + 1)
    const after = snapshots.length
    await writeFile(temporary.path, bytes)
    await delay(180)
    assert.equal(snapshots.length, after)
    bytes[0x21ad6] ^= 1
    await writeFile(temporary.path, bytes)
    await eventually(() => watcher.snapshot.status === 'error')
    assert.deepEqual(watcher.snapshot.pokedex!.caughtSpeciesIds, [522])
  } finally { watcher.stop(); await temporary.cleanup() }
})

test('readStableSave opens read-only, preserves bytes/mtime, rejects missing and incomplete files', async () => {
  const temporary = await temporarySave()
  try {
    await assert.rejects(readStableSave(temporary.path, 1))
    await writeFile(temporary.path, Buffer.alloc(100))
    await assert.rejects(readStableSave(temporary.path, 1), /512/)
    const bytes = saveFixture()
    await writeFile(temporary.path, bytes)
    const before = await stat(temporary.path)
    assert.deepEqual(await readStableSave(temporary.path, 1), bytes)
    assert.equal((await stat(temporary.path)).mtimeMs, before.mtimeMs)
    assert.deepEqual(await readFile(temporary.path), bytes)
  } finally { await temporary.cleanup() }
})

test('native watcher debounces writes, suppresses identical parties, recovers replacement/deletion, preserves last valid team', async () => {
  const temporary = await temporarySave()
  const snapshots: SaveSnapshot[] = []
  const watcher = new SaveWatcher(temporary.path, snapshot => snapshots.push(snapshot), options)
  try {
    watcher.start()
    await eventually(() => watcher.snapshot.status === 'missing')
    const initial = saveFixture()
    await writeFile(temporary.path, initial)
    await eventually(() => watcher.snapshot.status === 'ready')
    const first = snapshots.length
    await writeFile(temporary.path, initial)
    await writeFile(temporary.path, initial)
    await delay(200)
    assert.equal(snapshots.length, first)
    // An old backup must not roll back an already displayed party.
    const broken = saveFixture([pk5Fixture(496)], [pk5Fixture(551)])
    broken[0x19336] ^= 1
    await writeFile(temporary.path, broken)
    await eventually(() => watcher.snapshot.status === 'error')
    assert.equal(watcher.snapshot.party![0].speciesId, 502)
    const replacement = join(temporary.directory, 'replacement.tmp')
    await writeFile(replacement, saveFixture([pk5Fixture(554, 23), pk5Fixture(520, 22)]))
    await rename(replacement, temporary.path)
    await eventually(() => watcher.snapshot.party?.[0].speciesId === 554)
    assert.equal(watcher.snapshot.party!.length, 2)
    await unlink(temporary.path)
    await eventually(() => watcher.snapshot.status === 'missing')
    assert.equal(watcher.snapshot.party![0].speciesId, 554)
    await writeFile(temporary.path, saveFixture([]))
    await eventually(() => watcher.snapshot.status === 'ready' && watcher.snapshot.party?.length === 0)
  } finally { watcher.stop(); await temporary.cleanup() }
})

test('temporary file lock retries automatically and stops cleanly', async () => {
  let reads = 0
  let updates = 0
  const temporary = await temporarySave()
  const watcher = new SaveWatcher(temporary.path, () => updates++, { ...options, read: async () => {
    reads++
    if (reads < 3) throw Object.assign(new Error('busy'), { code: 'EBUSY' })
    return saveFixture()
  } })
  try {
    watcher.start()
    await eventually(() => watcher.snapshot.status === 'ready')
    assert.equal(reads, 3)
    assert.equal(updates, 1)
    watcher.stop()
    await delay(180)
    assert.equal(reads, 3)
  } finally { watcher.stop(); await temporary.cleanup() }
})

test('bridge SSE sends initial/current party and changes; denies foreign origins and has no mutation routes', async () => {
  const temporary = await temporarySave()
  await writeFile(temporary.path, saveFixture())
  const bridge = createSaveBridge(temporary.path, options)
  const controller = new AbortController()
  try {
    await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
    const address = bridge.server.address()
    assert.ok(address && typeof address === 'object')
    const base = `http://127.0.0.1:${address.port}`
    assert.equal((await fetch(`${base}/save-api/events`, { headers: { Origin: 'https://example.com' } })).status, 403)
    assert.equal((await fetch(`${base}/save-api/events`, { method: 'POST' })).status, 404)
    const response = await fetch(`${base}/save-api/events`, { signal: controller.signal })
    assert.equal(response.headers.get('content-type'), 'text/event-stream')
    const reader = response.body!.getReader()
    let received = ''
    const pump = (async () => {
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) return
          received += new TextDecoder().decode(chunk.value)
        }
      } catch { /* Expected abort on cleanup. */ }
    })()
    await eventually(() => received.includes('"speciesId":502'))
    await writeFile(temporary.path, saveFixture([pk5Fixture(496, 26)]))
    await eventually(() => received.includes('"speciesId":496') && received.includes('"level":26'))
    controller.abort()
    await pump
  } finally { controller.abort(); await bridge.close(); await temporary.cleanup() }
})
