import { readFile } from 'node:fs/promises'
import { createLiveBridge } from './live-server.mjs'

let config = {}
try { config = JSON.parse(await readFile('live.config.local.json', 'utf8')) }
catch (error) { if (error.code !== 'ENOENT') { console.error('[live]', error.message); process.exit(1) } }
const port = Number(process.env.LIVE_BRIDGE_PORT ?? 3002)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('LIVE_BRIDGE_PORT inválido.')
for (const key of ['pollMs', 'fastPollMs', 'boxesPollMs']) {
  const maximum = key === 'boxesPollMs' ? 600000 : 60000
  if (config[key] !== undefined && (!Number.isInteger(config[key]) || config[key] < 1000 || config[key] > maximum)) throw new Error(`${key} debe estar entre 1000 y ${maximum}.`)
}
const bridge = createLiveBridge(config)
bridge.server.on('error', error => { console.error('[live]', error.message); process.exitCode = 1; void bridge.close() })
bridge.server.listen(port, '127.0.0.1', () => console.log(`[live] Servicio de lectura en vivo: http://127.0.0.1:${port} · conexión manual desde la app`))
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void bridge.close() })
