import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import { LivePartyController } from './live-party-controller.ts'
import type { PartyReader } from './live-party-controller.ts'

export function createXLiveBridge(options: { factory?: () => PartyReader; pollMs?: number } = {}) {
  const clients = new Set<ServerResponse>()
  const controller = new LivePartyController(snapshot => {
    for (const client of clients) {
      if (client.writableLength > 1024 * 1024) client.destroy()
      else client.write(`data: ${JSON.stringify(snapshot)}\n\n`)
    }
  }, options.factory, options.pollMs)
  const server = createServer((request, response) => {
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(request.headers.host ?? '') || (request.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(request.headers.origin)) || request.headers['sec-fetch-site'] === 'cross-site') { response.writeHead(403).end(); return }
    if (request.method === 'GET' && request.url === '/x-live-api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ application: 'poke-chose', service: 'x-live', workspace: process.cwd() })); return
    }
    if (request.method === 'POST' && ['/x-live-api/connect', '/x-live-api/disconnect', '/x-live-api/refresh'].includes(request.url ?? '')) {
      if (request.headers['content-type'] !== 'application/json' || !clients.size) { response.writeHead(403).end(); return }
      request.resume()
      if (request.url === '/x-live-api/connect') controller.connect()
      else if (request.url === '/x-live-api/refresh') controller.refresh()
      else controller.disconnect()
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true })); return
    }
    if (request.method !== 'GET' || request.url !== '/x-live-api/events') { response.writeHead(404).end(); return }
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
    response.write(`retry: 2000\ndata: ${JSON.stringify(controller.snapshot)}\n\n`)
    clients.add(response)
    response.on('close', () => { clients.delete(response); if (!clients.size) controller.disconnect() })
  })
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (client.writableLength > 1024 * 1024) client.destroy()
      else client.write(': heartbeat\n\n')
    }
  }, 15000)
  heartbeat.unref()
  return { server, controller, close: async () => {
    clearInterval(heartbeat); controller.disconnect()
    for (const client of clients) client.end()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  } }
}
