import { spawn } from 'node:child_process'
import { bridgeRunning } from './bridge-processes.mjs'

// Reuse compatible bridges; only stop children owned by this launcher.
const preview = process.argv.includes('--preview')
const open = process.argv.includes('--open')
const processes = []
try {
  const services = [
    { name: 'live', port: Number(process.env.LIVE_BRIDGE_PORT ?? 3002), file: 'bridge/live-index.mjs' },
    { name: 'save', port: Number(process.env.SAVE_BRIDGE_PORT ?? 3001), file: 'bridge/index.ts' },
    { name: 'enemy', port: 3003, file: 'experiments/melonds-live/watch-enemy.mjs', args: ['--battle', '--wait'] },
  ]
  const existing = await Promise.all(services.map(service => bridgeRunning(service.port, service.name)))
  for (const [index, service] of services.entries()) {
    if (existing[index]) console.log(`[${service.name}] Reutilizando servicio local activo en el puerto ${service.port}.`)
    else processes.push(spawn(process.execPath, ['--experimental-strip-types', service.file, ...(service.args ?? [])], { stdio: 'inherit', windowsHide: true }))
  }
  processes.push(spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(preview ? ['preview'] : []), ...(open ? ['--open'] : [])], { stdio: 'inherit', windowsHide: true }))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of processes) child.kill()
  process.exitCode = code
}
for (const child of processes) {
  child.on('error', error => { console.error(error.message); stop(1) })
  child.on('exit', code => stop(code ?? 0))
}
process.once('SIGINT', () => stop())
process.once('SIGTERM', () => stop())
