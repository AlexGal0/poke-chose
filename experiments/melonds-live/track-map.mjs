import { readFile, mkdir, appendFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { GdbReader } from '../../bridge/live/gdb.mjs'
import { findMapCandidates, sampleMapCandidates } from './map-candidates.mjs'

// One connection for the entire experiment. Reports contain candidate numbers,
// not RAM dumps, save contents or a claimed map-to-zone correspondence.
const config = JSON.parse(await readFile('live.config.local.json', 'utf8'))
const reader = new GdbReader({ ...config, onStatus: message => console.log(message) })
const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
let addresses = []
let initialMap
let previous = new Map()
await mkdir(new URL('./artifacts/', import.meta.url), { recursive: true })
const report = new URL(`./artifacts/map-candidates-${Date.now()}.jsonl`, import.meta.url)
const record = async value => {
  console.log(JSON.stringify(value))
  await appendFile(report, JSON.stringify({ observedAt: new Date().toISOString(), ...value }) + '\n')
}
try {
  await reader.connect()
  console.log('Conexión única abierta. Comandos: scan <mapa>, sample <etiqueta>, quit.')
  for await (const line of input) {
    const [command, ...args] = line.trim().split(/\s+/)
    if (command === 'quit') break
    try {
      if (command === 'scan') {
        const mapId = Number(args[0])
        if (args.length !== 1 || !Number.isInteger(mapId) || mapId < 0 || mapId > 65535) throw new Error('Usa scan <mapa uint16>.')
        console.log('Leyendo RAM principal en la conexión actual; mantén al jugador en la misma zona.')
        const ram = await reader.readMemory(0x02000000, 0x400000)
        addresses = findMapCandidates(ram, 0x02000000, mapId)
        initialMap = mapId
        previous = new Map(addresses.map(address => [address, mapId]))
        await record({ command, initialMap, count: addresses.length, candidateAddresses: addresses.map(address => `0x${address.toString(16)}`), confirmedLive: false })
      } else if (command === 'sample') {
        if (!addresses.length || !args.length) throw new Error('Ejecuta scan primero y usa sample <etiqueta>.')
        const samples = await sampleMapCandidates(reader, addresses)
        const changed = samples.filter(sample => sample.stable && sample.value !== previous.get(sample.address))
        for (const sample of samples) if (sample.stable) previous.set(sample.address, sample.value)
        await record({ command, label: args.join(' '), initialMap, count: samples.length, unstable: samples.filter(sample => !sample.stable).length,
          changed: changed.map(sample => ({ ...sample, address: `0x${sample.address.toString(16)}` })), confirmedLive: false })
      } else console.log('Comandos: scan <mapa>, sample <etiqueta>, quit.')
    } catch (error) {
      console.error(error.message)
      if (reader.socket?.destroyed) break
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally { input.close(); await reader.disconnect() }
