import { createServer } from 'node:http'
import { GdbReader } from '../../bridge/live/gdb.mjs'
import { parsePk5 } from '../../bridge/parser.ts'
import { consistentEnemyCandidate } from '../../src/domain/enemy-prototype.ts'

export function createEnemyServer(config, makeReader = options => new GdbReader(options)) {
  let addresses = config.addresses ?? []
  function validateAddresses() {
    if (!addresses.length || addresses.length > 32 || addresses.some(address => !Number.isInteger(address) || address < 0x02000000 || address + 220 > 0x02400000)) throw new Error('Direcciones candidatas inválidas.')
  }
  if (addresses.length) validateAddresses()
  let reader = null
  let snapshot = { status: 'waiting', message: 'Conecta el lector de combate.', candidates: [], updatedAt: null }
  let timer
  let sampling = Promise.resolve()
  let connecting = null
  let researching = null
  let generation = 0
  let closed = false
  async function sample(token) {
    const current = reader
    try {
      const candidates = []
      if (config.readEnemyBattle) {
        try { candidates.push(...await config.readEnemyBattle(current)) }
        catch (error) {
          if (current.socket?.destroyed) throw error
          candidates.push({ error: error.message })
        }
      } else for (const address of addresses) {
        try {
          const first = await current.readMemory(address, 220)
          const second = await current.readMemory(address, 220)
          if (!first.equals(second)) throw new Error('Muestra inestable')
          const member = parsePk5(first)
          if (member.isEgg || !member.maxHp || member.currentHp > member.maxHp) throw new Error('Datos inválidos')
          candidates.push({ address: `0x${address.toString(16)}`, speciesId: member.speciesId, form: member.form, level: member.level, personality: member.personality, trainerId: member.trainerId })
        } catch (error) {
          if (current.socket?.destroyed) throw error
          candidates.push({ address: `0x${address.toString(16)}`, error: error.message })
        }
      }
      let activeCandidates = []
      let activeMessage = ''
      let battleTeam = null
      let enemyVitalsCandidates = []
      let enemyVitalsMessage = ''
      if (config.readEnemyBattle) enemyVitalsCandidates = candidates
      else if (config.readEnemyVitals) {
        try { enemyVitalsCandidates = await config.readEnemyVitals(current, candidates) }
        catch (error) {
          if (current.socket?.destroyed) throw error
          enemyVitalsMessage = error.message
        }
      }
      if (config.readOwnBattle || config.readActive) {
        try {
          if (config.readOwnBattle) {
            if (consistentEnemyCandidate(candidates) || config.readBattlePresence) {
              const own = await config.readOwnBattle(current)
              activeCandidates = own.activeCandidates
              battleTeam = own.battleTeam
            }
          } else activeCandidates = await config.readActive(current)
        }
        catch (error) {
          if (current.socket?.destroyed) throw error
          activeMessage = error.message
        }
      }
      let battleActive = null
      if (config.readBattlePresence) {
        try { battleActive = await config.readBattlePresence(current) }
        catch (error) { if (current.socket?.destroyed) throw error }
      }
      if (battleActive === false) {
        candidates.length = 0
        activeCandidates = []
        battleTeam = null
        enemyVitalsCandidates = []
      }
      if (closed || token !== generation) return
      snapshot = { status: 'ready', message: 'Lectura experimental del combate activa.', candidates, activeCandidates, activeMessage, battleTeam, enemyVitalsCandidates, enemyVitalsMessage, battleActive, updatedAt: new Date().toISOString() }
      await config.onSample?.(snapshot)
      if (!closed && token === generation) timer = setTimeout(() => { sampling = sample(token) }, config.pollMs ?? 2000)
    } catch (error) {
      if (closed || token !== generation) return
      current?.close()
      reader = null
      snapshot = { status: 'error', message: `Lectura de combate desconectada: ${error.message}. Pulsa Reconectar combate.`, candidates: [], updatedAt: new Date().toISOString() }
      await config.onSample?.(snapshot)
    }
  }
  async function reconnect() {
    const token = ++generation
    clearTimeout(timer)
    await sampling
    clearTimeout(timer)
    if (closed) throw new Error('El servicio de combate está cerrado.')
    snapshot = { status: 'waiting', message: 'Conectando con melonDS…', candidates: [], updatedAt: null }
    try {
      if (!reader || reader.socket?.destroyed) {
        reader?.close()
        reader = makeReader(config.readerOptions)
        await reader.connect()
      }
      if (!config.readEnemyBattle) {
        if (!addresses.length && config.discover) addresses = await config.discover(reader)
        validateAddresses()
      }
      sampling = sample(token)
      await sampling
      if (snapshot.status === 'error') throw new Error(snapshot.message)
    } catch (error) {
      if (!closed && token === generation) {
        reader?.close()
        reader = null
        snapshot = { status: 'error', message: error.message, candidates: [], updatedAt: new Date().toISOString() }
      }
      throw error
    }
  }
  function connect() {
    if (researching) return researching.then(connect)
    if (!connecting) {
      connecting = reconnect()
      void connecting.finally(() => { connecting = null }).catch(() => {})
    }
    return connecting
  }
  function research() {
    if (!config.research) return Promise.reject(new Error('Investigación no configurada.'))
    if (!researching) {
      researching = (async () => {
        if (connecting) await connecting
        const token = ++generation
        clearTimeout(timer)
        await sampling
        clearTimeout(timer)
        if (closed || !reader || reader.socket?.destroyed) throw new Error('Conecta el lector de combate antes de investigar.')
        try { return await config.research(reader) }
        finally {
          if (!closed && reader && token === generation) { sampling = sample(token); await sampling }
        }
      })()
      void researching.finally(() => { researching = null }).catch(() => {})
    }
    return researching
  }
  const server = createServer((req, res) => {
    if (!['127.0.0.1', 'localhost'].includes(req.headers.host?.split(':')[0])) { res.writeHead(403).end(); return }
    if (req.method === 'GET' && req.url === '/enemy-api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ application: 'poke-chose', service: 'enemy', workspace: process.cwd() }))
      return
    }
    if (req.method === 'GET' && req.url === '/enemy-api/snapshot') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(snapshot))
      return
    }
    if (req.method === 'POST' && ['/enemy-api/connect', '/enemy-api/research'].includes(req.url)) {
      let originAllowed = !req.headers.origin
      try { if (req.headers.origin) originAllowed = ['127.0.0.1', 'localhost'].includes(new URL(req.headers.origin).hostname) } catch { originAllowed = false }
      if (!originAllowed || req.headers['content-type'] !== 'application/json') { res.writeHead(403).end(); return }
      req.resume()
      const action = req.url === '/enemy-api/research' ? research() : connect()
      action.then(result => {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result ?? { message: 'Lectura de combate conectada.' }))
      }, error => {
        res.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: error.message }))
      })
      return
    }
    res.writeHead(404).end()
  })
  return { server, connect, async close() {
    closed = true
    generation++
    clearTimeout(timer)
    reader?.close()
    await sampling
    await new Promise(resolve => server.close(resolve))
  } }
}
