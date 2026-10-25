import { createXLiveBridge } from './citra/live-party-server.ts'

const port = Number(process.env.X_LIVE_BRIDGE_PORT ?? 15305)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid X_LIVE_BRIDGE_PORT')
const bridge = createXLiveBridge()
bridge.server.on('error', error => { console.error('[x-live]', error.message); process.exitCode = 1; void bridge.close().catch(() => {}) })
bridge.server.listen(port, '127.0.0.1', () => console.log(`[x-live] Bridge de equipo: http://127.0.0.1:${port} · conexión manual`))
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void bridge.close() })
