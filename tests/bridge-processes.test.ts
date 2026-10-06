import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { RequestListener } from 'node:http'
import { bridgeRunning } from '../scripts/bridge-processes.mjs'

async function serverFor(handler: RequestListener) {
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  return { server, port: address.port, close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()) }) }
}

test('launcher reuses matching bridge but rejects other workspaces and unrelated listeners', async () => {
  const bridge = await serverFor((_req, res) => res.setHeader('Content-Type', 'application/json').end(JSON.stringify({ application: 'poke-chose', service: 'live', workspace: process.cwd() })))
  try {
    assert.equal(await bridgeRunning(bridge.port, 'live'), true)
    await assert.rejects(bridgeRunning(bridge.port, 'live', 'another-workspace'), /ocupado/)
    await assert.rejects(bridgeRunning(bridge.port, 'save'), /ocupado/)
  } finally { await bridge.close() }
  assert.equal(await bridgeRunning(bridge.port, 'live'), false)
})

test('launcher recognizes legacy SSE bridge without connecting GDB and rejects malformed snapshots', async () => {
  let valid = true
  const bridge = await serverFor((req, res) => {
    if (req.url?.endsWith('/health')) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.write(`data: ${JSON.stringify(valid ? { status: 'waiting', message: 'Idle', backup: false, updatedAt: null, party: null, boxes: null, pokedex: null } : { status: 'ready' })}\n\n`)
  })
  try {
    assert.equal(await bridgeRunning(bridge.port, 'live'), true)
    valid = false
    await assert.rejects(bridgeRunning(bridge.port, 'live'), /ocupado/)
  } finally { await bridge.close() }
})
