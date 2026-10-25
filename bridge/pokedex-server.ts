import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import type { SavePokedexReader } from '../src/games/core/save-pokedex.ts'
import { emptyPokedexSnapshot } from '../src/sources/pokedex-snapshot.ts'
import { PokedexWatcher } from './pokedex-watcher.ts'
import type { PokedexWatchOptions } from './pokedex-watcher.ts'

export function createPokedexBridge(path: string | null, sourceId: string, reader: SavePokedexReader, options: PokedexWatchOptions = {}) {
  const clients = new Set<ServerResponse>()
  const watcher = path ? new PokedexWatcher(path, sourceId, reader, snapshot => {
    for (const client of clients) {
      if (client.writableLength > 1024 * 1024) client.destroy()
      else client.write(`data: ${JSON.stringify(snapshot)}\n\n`)
    }
  }, options) : null
  const server = createServer((request, response) => {
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(request.headers.host ?? '') || (request.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(request.headers.origin))) {
      response.writeHead(403).end('Local access only'); return
    }
    if (request.method === 'GET' && request.url === `/${sourceId}-api/health`) {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ application: 'poke-chose', service: sourceId, workspace: process.cwd() })); return
    }
    if (request.method !== 'GET' || request.url !== `/${sourceId}-api/events`) { response.writeHead(404).end(); return }
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    const snapshot = watcher?.snapshot ?? { ...emptyPokedexSnapshot(sourceId), message: 'unconfigured' }
    response.write(`retry: 2000\ndata: ${JSON.stringify(snapshot)}\n\n`)
    clients.add(response)
    request.on('close', () => clients.delete(response))
  })
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (client.writableLength > 1024 * 1024) client.destroy()
      else client.write(': heartbeat\n\n')
    }
  }, 15000)
  heartbeat.unref()
  server.on('listening', () => watcher?.start())
  server.on('close', () => { watcher?.stop(); clearInterval(heartbeat) })
  return { server, watcher, close: async () => {
    watcher?.stop(); clearInterval(heartbeat)
    for (const client of clients) client.end()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  } }
}
