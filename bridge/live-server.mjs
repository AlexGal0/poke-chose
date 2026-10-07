import { createServer } from 'node:http'
import { GdbReader } from './live/gdb.mjs'
import { readParty } from './live/party.mjs'
import { readBoxes, readPokedex } from './live/storage.mjs'
import { isSaveSnapshot } from '../src/models/party.ts'
import { readPlayerPosition } from './live/position.mjs'

export function createLiveBridge(config, makeReader = options => new GdbReader(options)) {
  const clients = new Set()
  let reader = null
  let generation = 0
  let timer
  let closed = false
  let control = Promise.resolve()
  let sampling = Promise.resolve()
  const fastPollMs = config.fastPollMs ?? config.pollMs ?? 3000
  const boxesPollMs = config.boxesPollMs ?? 120000
  let boxesAttemptAt = null
  let cachedBoxes = null
  let active = false
  let refreshRequest = null
  let boxesError = null
  const identity = p => `${p.personality}-${p.trainerId}-${p.speciesId}`
  let snapshot = { status: 'waiting', message: 'pressConnect', party: null, boxes: null, pokedex: null, updatedAt: null, backup: false }
  function publish(next) {
    snapshot = { ...snapshot, ...next }
    for (const client of clients) client.write(`data: ${JSON.stringify(snapshot)}\n\n`)
  }
  function stop() {
    generation++
    clearTimeout(timer)
    reader?.close()
    reader = null
    active = false
    boxesAttemptAt = null
  }
  async function pause() {
    active = false
    generation++
    clearTimeout(timer)
    await sampling
  }
  function schedule(token) { sampling = sample(token) }
  async function sample(token) {
    if (closed || token !== generation) return
    const current = reader
    try {
      const party = await readParty(current, config)
      const pokedex = await readPokedex(current, config)
      const refreshBoxes = boxesAttemptAt === null || Date.now() - boxesAttemptAt >= boxesPollMs
      let boxes = cachedBoxes
      if (refreshBoxes) {
        try {
          boxes = await readBoxes(current, config)
          boxesError = null
        } catch (error) {
          boxesError = error.message
          if (current.socket?.destroyed) throw error
        } finally {
          // Failed attempts also wait for the slow interval; manual refresh can retry.
          boxesAttemptAt = Date.now()
        }
      }
      const after = await readParty(current, config)
      if (JSON.stringify(party) !== JSON.stringify(after)) throw new Error('El equipo cambió mientras se leían las cajas. Reintentando la muestra.')
      const partyIdentities = new Set(party.map(identity))
      if (refreshBoxes && !boxesError && boxes.some(member => partyIdentities.has(identity(member)))) throw new Error('Movimiento entre equipo y cajas en curso. Actualiza la colección para reintentar.')
      // Old PC locations may overlap a newly withdrawn party member. Keep the team
      // fresh without rereading PC or publishing the same individual twice.
      const visibleBoxes = boxes?.filter(member => !partyIdentities.has(identity(member))) ?? null
      let position = null
      try { position = await readPlayerPosition(current, config) }
      catch (error) {
        // Location is optional; an unstable/invalid sample must not discard the team.
        if (current.socket?.destroyed) throw error
      }
      const next = { status: 'ready', message: boxesError ? 'readyBoxesFailed' : 'readyActive', party, boxes: visibleBoxes, pokedex, position, updatedAt: new Date().toISOString(), backup: false }
      if (!isSaveSnapshot(next)) throw new Error('La memoria no contiene una partida compatible.')
      if (token === generation) {
        if (refreshBoxes && !boxesError) cachedBoxes = boxes
        publish(next)
      }
    } catch (error) {
      if (token !== generation || closed) return
      if (current.socket?.destroyed) {
        stop()
        publish({ status: 'error', message: 'connectionLost' })
        return
      }
      publish({ status: 'waiting', message: 'waitingUnstable' })
    }
    if (!closed && token === generation) timer = setTimeout(() => { schedule(token) }, fastPollMs)
  }
  async function connect() {
    await pause()
    boxesAttemptAt = null
    const token = generation
    publish({ status: 'waiting', message: 'connecting' })
    if (!config.partyAddress || !config.partyCountAddress || !config.boxesAddress || !config.pokedexAddress) {
      stop()
      publish({ status: 'error', message: 'missingConfig' })
      return
    }
    try {
      if (!reader || reader.socket?.destroyed) {
        reader = makeReader(config)
        const connection = reader
        await connection.connect()
        connection.socket?.once?.('close', () => {
          if (!closed && reader === connection) {
            stop()
            publish({ status: 'error', message: 'connectionLost' })
          }
        })
      }
      if (closed || token !== generation) return
      active = true
      schedule(token)
    } catch {
      if (token !== generation) return
      stop()
      publish({ status: 'error', message: 'connectFailed' })
    }
  }
  async function refreshBoxesNow() {
    if (!active || !reader || closed) throw new Error('notConnected')
    clearTimeout(timer)
    await sampling
    clearTimeout(timer)
    if (!active || !reader || closed) throw new Error('inactive')
    boxesAttemptAt = null
    schedule(generation)
    await sampling
    if (snapshot.status !== 'ready' || boxesError) throw new Error('refreshFailed')
  }
  const server = createServer((req, res) => {
    const host = req.headers.host?.split(':')[0]
    if (!['127.0.0.1', 'localhost'].includes(host)) { res.writeHead(403).end(); return }
    if (req.method === 'GET' && req.url === '/live-api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ application: 'poke-chose', service: 'live', workspace: process.cwd() }))
      return
    }
    if (req.method === 'GET' && req.url === '/live-api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`)
      clients.add(res)
      req.on('close', () => clients.delete(res))
      return
    }
    if (req.method === 'POST' && ['/live-api/connect', '/live-api/disconnect', '/live-api/refresh-boxes'].includes(req.url)) {
      let originAllowed = !req.headers.origin
      try { if (req.headers.origin) originAllowed = ['127.0.0.1', 'localhost'].includes(new URL(req.headers.origin).hostname) } catch { originAllowed = false }
      if (!originAllowed || req.headers['content-type'] !== 'application/json') { res.writeHead(403).end(); return }
      req.resume()
      if (req.url === '/live-api/refresh-boxes') {
        if (!refreshRequest) {
          refreshRequest = control.then(refreshBoxesNow)
          control = refreshRequest.catch(() => {})
          void refreshRequest.finally(() => { refreshRequest = null }).catch(() => {})
        }
        refreshRequest.then(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({}))
        }, error => {
          res.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: error.message }))
        })
        return
      }
      control = control.then(async () => {
        if (closed) return
        if (req.url === '/live-api/connect') await connect()
        else {
          publish({ status: 'waiting', message: 'stopping' })
          await pause()
          publish({ status: 'waiting', message: 'paused' })
        }
      })
      res.writeHead(202).end()
      return
    }
    res.writeHead(404).end()
  })
  const heartbeat = setInterval(() => { for (const client of clients) client.write(': heartbeat\n\n') }, 15000)
  heartbeat.unref()
  return {
    server,
    async close() {
      closed = true
      stop()
      clearInterval(heartbeat)
      for (const client of clients) client.end()
      clients.clear()
      await new Promise(resolve => server.close(resolve))
    },
  }
}
