import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error The experimental server is JavaScript.
import { createEnemyServer } from '../experiments/melonds-live/enemy-server.mjs'
import { pk5Fixture } from './helpers/save-fixture.ts'
import { bridgeRunning } from '../scripts/bridge-processes.mjs'

test('enemy reader clears disconnected data, reconnects explicitly and distinguishes invalid battle memory', { timeout: 10000 }, async t => {
  let connections = 0
  let loseConnection = false
  let invalidMemory = false
  const bridge = createEnemyServer({ addresses: [0x02000100, 0x02000200], pollMs: 10 }, () => {
    const instance = {
      socket: { destroyed: false },
      async connect() { connections++ },
      close() { instance.socket.destroyed = true },
      async readMemory() {
        if (loseConnection) { instance.socket.destroyed = true; throw new Error('Connection lost') }
        return invalidMemory ? Buffer.alloc(220) : pk5Fixture(568, 19)
      },
    }
    return instance
  })
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  const snapshot = async () => (await fetch(url + '/enemy-api/snapshot')).json()
  const connect = (origin?: string) => fetch(url + '/enemy-api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: '{}' })
  const until = async (status: string) => {
    for (let index = 0; index < 100; index++) {
      const result = await snapshot()
      if (result.status === status) return result
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    throw new Error('Expected reader status: ' + status)
  }
  assert.equal((await snapshot()).status, 'waiting')
  assert.equal(await bridgeRunning(address.port, 'enemy'), true)
  assert.equal(connections, 0, 'checking service identity must not connect GDB')
  assert.equal((await connect('https://example.com')).status, 403)
  assert.equal(connections, 0)
  assert.equal((await connect()).status, 200)
  assert.equal((await until('ready')).candidates[0].speciesId, 568)
  loseConnection = true
  const lost = await until('error')
  assert.deepEqual(lost.candidates, [])
  assert.match(lost.message, /Reconectar combate/)
  loseConnection = false
  const reconnected = await Promise.all([connect(), connect()])
  assert.deepEqual(reconnected.map(response => response.status), [200, 200])
  assert.equal(connections, 2)
  assert.equal((await until('ready')).candidates[0].level, 19)
  // Reconnecting an already healthy reader reuses the socket.
  assert.equal((await connect()).status, 200)
  assert.equal(connections, 2)
  invalidMemory = true
  let cleared = await snapshot()
  for (let index = 0; index < 100 && !cleared.candidates[0].error; index++) {
    await new Promise(resolve => setTimeout(resolve, 10))
    cleared = await snapshot()
  }
  assert.equal(cleared.status, 'ready', 'invalid candidate memory is not a network disconnection')
  assert.ok(cleared.candidates.every((candidate: { error?: string }) => candidate.error))
})

test('enemy service remains available after an initial handshake failure and can recover', async t => {
  let fail = true
  const bridge = createEnemyServer({ addresses: [0x02000100, 0x02000200] }, () => ({
    socket: { destroyed: false },
    async connect() { if (fail) throw new Error('Handshake timeout') },
    close() {},
    async readMemory() { return pk5Fixture(572, 22) },
  }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  await assert.rejects(bridge.connect(), /Handshake timeout/)
  const failed = await (await fetch(url + '/enemy-api/snapshot')).json()
  assert.equal(failed.status, 'error')
  assert.deepEqual(failed.candidates, [])
  fail = false
  await bridge.connect()
  const recovered = await (await fetch(url + '/enemy-api/snapshot')).json()
  assert.equal(recovered.status, 'ready')
  assert.equal(recovered.candidates[0].speciesId, 572)
})

test('active probe failures preserve enemy readings and clear unconfirmed own data', async t => {
  let fail = false
  const own = { address: '0x02003000', speciesId: 507, form: 0, level: 25, personality: 5, trainerId: 6, slot: 3 }
  const bridge = createEnemyServer({ addresses: [0x02000100, 0x02000200],
    async readActive() { if (fail) throw new Error('Party changed'); return [own, own] },
  }, () => ({ socket: { destroyed: false }, async connect() {}, close() {}, async readMemory() { return pk5Fixture(568, 21) } }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}/enemy-api/snapshot`
  await bridge.connect()
  assert.deepEqual((await (await fetch(url)).json()).activeCandidates, [own, own])
  fail = true
  await bridge.connect()
  const waiting = await (await fetch(url)).json()
  assert.equal(waiting.status, 'ready')
  assert.equal(waiting.candidates[0].speciesId, 568)
  assert.deepEqual(waiting.activeCandidates, [])
  assert.equal(waiting.activeMessage, 'Party changed')
})

test('research captures serialize with sampling on the same connection', async t => {
  let inFlight = 0
  let connections = 0
  let captures = 0
  const bridge = createEnemyServer({ addresses: [0x02000100, 0x02000200], pollMs: 10,
    async research(reader: { readMemory: (address: number, length: number) => Promise<Buffer> }) { captures++; await reader.readMemory(0x02000300, 220); return { captured: true } },
  }, () => ({ socket: { destroyed: false }, async connect() { connections++ }, close() {},
    async readMemory() {
      assert.equal(inFlight, 0, 'GDB operations must not overlap')
      inFlight++
      await new Promise(resolve => setTimeout(resolve, 5))
      inFlight--
      return pk5Fixture(568, 21)
    },
  }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  await bridge.connect()
  const post = () => fetch(url + '/enemy-api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  const results = await Promise.all([post(), post()])
  assert.deepEqual(results.map(response => response.status), [200, 200])
  assert.deepEqual(await results[0].json(), { captured: true })
  assert.equal(captures, 1)
  assert.equal(connections, 1)
  const sample = await (await fetch(url + '/enemy-api/snapshot')).json()
  assert.equal(sample.status, 'ready')
})

test('enemy health updates and clears on failure without hiding a confirmed identity', async t => {
  let hp = 53
  let fail = false
  const bridge = createEnemyServer({ addresses: [0x02000100, 0x02000200],
    async readEnemyVitals(_reader: unknown, candidates: object[]) {
      if (fail) throw new Error('Unstable HP')
      return candidates.map(candidate => ({ ...candidate, currentHp: hp, maxHp: 53 }))
    },
  }, () => ({ socket: { destroyed: false }, async connect() {}, close() {}, async readMemory() { return pk5Fixture(568, 19) } }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const snapshot = async () => (await fetch(`http://127.0.0.1:${address.port}/enemy-api/snapshot`)).json()
  await bridge.connect()
  assert.equal((await snapshot()).enemyVitalsCandidates[0].currentHp, 53)
  hp = 21
  await bridge.connect()
  assert.equal((await snapshot()).enemyVitalsCandidates[0].currentHp, 21)
  fail = true
  await bridge.connect()
  const missing = await snapshot()
  assert.equal(missing.status, 'ready')
  assert.equal(missing.candidates[0].speciesId, 568)
  assert.deepEqual(missing.enemyVitalsCandidates, [])
  assert.equal(missing.enemyVitalsMessage, 'Unstable HP')
})

test('full battle team is sampled only during a confirmed battle and cleared after failure or escape', async t => {
  let inBattle = true
  let fail = false
  let ownReads = 0
  const member = { address: '', speciesId: 522, form: 0, level: 24, personality: 5, trainerId: 6, slot: 0, isEgg: false, currentHp: 62, maxHp: 62 }
  const bridge = createEnemyServer({ addresses: [0x02000100, 0x02000200],
    async readOwnBattle() {
      ownReads++
      if (fail) throw new Error('Party unstable')
      return { activeCandidates: [member, member], battleTeam: [member] }
    },
  }, () => ({ socket: { destroyed: false }, async connect() {}, close() {}, async readMemory() { return inBattle ? pk5Fixture(568, 19) : Buffer.alloc(220) } }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const snapshot = async () => (await fetch(`http://127.0.0.1:${address.port}/enemy-api/snapshot`)).json()
  await bridge.connect()
  assert.deepEqual((await snapshot()).battleTeam, [member])
  fail = true
  await bridge.connect()
  assert.equal((await snapshot()).battleTeam, null)
  assert.deepEqual((await snapshot()).activeCandidates, [])
  assert.equal(ownReads, 2)
  fail = false
  inBattle = false
  await bridge.connect()
  assert.equal((await snapshot()).battleTeam, null)
  assert.equal(ownReads, 2, 'does not read battle arrays outside a confirmed battle')
})

test('field detection supports trainer battles without encounter addresses and clears the battle on exit', async t => {
  let inBattle = true
  let connections = 0
  let ownReads = 0
  const enemy = { address: '0x02000100', speciesId: 536, form: 0, level: 23, personality: 11, trainerId: 12, currentHp: 67, maxHp: 67 }
  const bridge = createEnemyServer({
    async readEnemyBattle() { return inBattle ? [enemy, enemy] : [{ address: enemy.address, error: 'Invalid pointer' }] },
    async readOwnBattle() { ownReads++; return { activeCandidates: [], battleTeam: [] } },
  }, () => ({ socket: { destroyed: false }, async connect() { connections++ }, close() {} }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const snapshot = async () => (await fetch(`http://127.0.0.1:${address.port}/enemy-api/snapshot`)).json()
  await bridge.connect()
  const trainer = await snapshot()
  assert.deepEqual(trainer.candidates, [enemy, enemy])
  assert.deepEqual(trainer.enemyVitalsCandidates, [enemy, enemy])
  assert.equal(ownReads, 1)
  inBattle = false
  await bridge.connect()
  const ended = await snapshot()
  assert.equal(ended.status, 'ready')
  assert.equal(ended.battleTeam, null)
  assert.equal(ownReads, 1)
  assert.equal(connections, 1)
})

test('battle presence is independent of trainer replacement and clears stale data on confirmed exit', async t => {
  let presence: boolean | null = true
  let changingOpponent = false
  const enemy = { address: '', speciesId: 513, form: 0, level: 23, personality: 1, trainerId: 2 }
  const own = { ...enemy, speciesId: 507, personality: 3, slot: 1, battleSlot: 0 }
  const bridge = createEnemyServer({
    async readEnemyBattle() { return changingOpponent ? [] : [enemy, enemy] },
    async readOwnBattle() { return { activeCandidates: [own, own], battleTeam: [own] } },
    async readBattlePresence() { return presence },
  }, () => ({ socket: { destroyed: false }, async connect() {}, close() {} }))
  await new Promise<void>(resolve => bridge.server.listen(0, '127.0.0.1', resolve))
  t.after(() => bridge.close())
  const address = bridge.server.address()
  assert.ok(address && typeof address !== 'string')
  const snapshot = async () => (await fetch(`http://127.0.0.1:${address.port}/enemy-api/snapshot`)).json()
  await bridge.connect()
  assert.equal((await snapshot()).battleActive, true)
  changingOpponent = true
  await bridge.connect()
  const gap = await snapshot()
  assert.equal(gap.battleActive, true)
  assert.deepEqual(gap.candidates, [])
  assert.deepEqual(gap.activeCandidates, [own, own])
  presence = null
  await bridge.connect()
  assert.equal((await snapshot()).battleActive, null)
  presence = false
  changingOpponent = false
  await bridge.connect()
  const ended = await snapshot()
  assert.equal(ended.battleActive, false)
  assert.deepEqual(ended.candidates, [])
  assert.deepEqual(ended.activeCandidates, [])
  assert.deepEqual(ended.enemyVitalsCandidates, [])
  assert.equal(ended.battleTeam, null)
})
