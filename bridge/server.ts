import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import { SaveWatcher } from './watcher.ts'
import type { SaveSnapshot } from '../src/models/party.ts'

export function createSaveBridge(savePath: string | null, options: ConstructorParameters<typeof SaveWatcher>[2] = {}) {
  const clients = new Set<ServerResponse>()
  const unconfigured: SaveSnapshot = { status: 'waiting', message: 'Configura save.config.local.json o MELONDS_SAVE_PATH y reinicia el bridge.', party: null, boxes: null, pokedex: null, updatedAt: null, backup: false }
  const emit = (snapshot: SaveSnapshot) => {
    const frame = `data: ${JSON.stringify(snapshot)}\n\n`
    for (const client of clients) {
      if (client.writableLength > 1024 * 1024) client.destroy()
      else client.write(frame)
    }
    console.log(`[save] Estado enviado a ${clients.size} cliente(s).`)
  }
  const watcher = savePath ? new SaveWatcher(savePath, emit, options) : null
  const server = createServer((request, response) => {
    // No filesystem/path configuration endpoints, no CORS, no remote listener.
    if (!request.headers.host?.match(/^(127\.0\.0\.1|localhost):\d+$/) ||
      (request.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(request.headers.origin))) {
      response.writeHead(403).end('Local access only')
      return
    }
    if (request.method === 'GET' && request.url === '/save-api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ application: 'poke-chose', service: 'save', workspace: process.cwd() }))
      return
    }
    if (request.method !== 'GET' || request.url !== '/save-api/events') {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    response.write(`retry: 2000\ndata: ${JSON.stringify(watcher?.snapshot ?? unconfigured)}\n\n`)
    clients.add(response)
    request.on('close', () => clients.delete(response))
  })
  const heartbeat = setInterval(() => {
    for (const client of clients) client.write(': heartbeat\n\n')
  }, 15000)
  heartbeat.unref()
  server.on('listening', () => watcher?.start())
  server.on('close', () => { watcher?.stop(); clearInterval(heartbeat) })
  return {
    server,
    close: async () => {
      watcher?.stop()
      clearInterval(heartbeat)
      for (const client of clients) client.end()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    },
  }
}
