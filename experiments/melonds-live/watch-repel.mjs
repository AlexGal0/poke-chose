import { readFile, mkdir, appendFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { GdbReader } from '../../bridge/live/gdb.mjs'
import { createLiveBridge } from '../../bridge/live-server.mjs'
import { compareRepelSamples, repelResearchRegion } from './repel-candidates.mjs'

// Replaces the general bridge during research, so the UI and probe share one
// ARM7 connection. Stop the normal general bridge before starting this script.
const config = JSON.parse(await readFile('live.config.local.json', 'utf8'))
const region = repelResearchRegion(config)
const port = Number(process.env.LIVE_BRIDGE_PORT ?? 3002)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Puerto de bridge inválido.')
await mkdir(new URL('./artifacts/', import.meta.url), { recursive: true })
const report = new URL(`./artifacts/repel-research-${Date.now()}.jsonl`, import.meta.url)
let label = 'baseline'
let force = true
let previous = null
let lastAttempt = 0
class ResearchReader extends GdbReader {
  async readMemory(address, length) {
    if (Number(address) === Number(config.partyCountAddress) && (force || Date.now() - lastAttempt >= (config.fastPollMs ?? 3000))) {
      lastAttempt = Date.now()
      try {
        const first = await super.readMemory(region.address, region.length)
        const second = await super.readMemory(region.address, region.length)
        const sample = compareRepelSamples(first, second, region.address, previous)
        if (force || !previous || sample.changes.length || !sample.stable) {
          const record = { observedAt: new Date().toISOString(), label, ...sample }
          await appendFile(report, JSON.stringify(record) + '\n')
          console.log(JSON.stringify(record))
        }
        if (sample.stable) { previous = second; force = false }
      } catch (error) {
        console.error('[repel research]', error.message)
        if (this.socket?.destroyed) throw error
      }
    }
    return super.readMemory(address, length)
  }
}
const bridge = createLiveBridge(config, options => new ResearchReader(options))
const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
console.log(`Región candidata 0x${region.address.toString(16)} (${region.length} bytes). Sin dirección confirmada.`)
console.log('Conecta desde la app. Comandos: label <acción realizada>, sample, quit. No abras otro lector general.')
input.on('line', line => {
  const command = line.trim()
  if (command.startsWith('label ') && command.length > 6) { label = command.slice(6); force = true; console.log(`Próxima muestra: ${label}`) }
  else if (command === 'sample') { force = true; console.log('Muestra solicitada para la próxima lectura del equipo.') }
  else if (command === 'quit') void close()
  else console.log('Comandos: label <acción realizada>, sample, quit.')
})
let closing = false
input.on('close', () => { void close() })
async function close() {
  if (closing) return
  closing = true
  input.close()
  await bridge.close()
}
bridge.server.on('error', error => { console.error(error.message); process.exitCode = 1; void close() })
bridge.server.listen(port, '127.0.0.1', () => console.log(`[repel research] Bridge general local en ${port}; informe ${report.pathname}`))
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void close() })
