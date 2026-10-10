const mode = process.argv[2]
if (!['fast', 'normal'].includes(mode)) throw new Error('Use fast or normal.')
const intervalMs = mode === 'fast' ? 500 : null
const port = process.env.LIVE_BRIDGE_PORT ?? 3002
const response = await fetch(`http://127.0.0.1:${port}/live-api/repel-poll`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ intervalMs }), signal: AbortSignal.timeout(30000),
})
if (!response.ok) throw new Error(`Live bridge: HTTP ${response.status}`)
console.log(intervalMs === null ? 'Repelente: sondeo general restaurado.' : 'Repelente: prueba a 500 ms activada.')
