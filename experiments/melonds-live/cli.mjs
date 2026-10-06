import { readFile, mkdir, writeFile, readdir, appendFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { GdbReader } from './gdb.mjs'
import { locateCandidates, locatePartyLayouts, readParty } from './party.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const command = process.argv[2] ?? 'probe'
let reader
let stopped = false
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stopped = true; reader?.close() })

try {
  if (!['probe', 'dump', 'locate', 'track', 'watch'].includes(command)) throw new Error('Comandos disponibles: probe, dump, locate, track, watch.')
  let config
  try { config = JSON.parse(await readFile(resolve(root, 'config.local.json'), 'utf8')) }
  catch (error) {
    if (error.code !== 'ENOENT') throw error
    config = JSON.parse(await readFile(resolve(root, 'config.example.json'), 'utf8'))
  }
  if (command === 'watch' && (!config.partyAddress || !config.partyCountAddress)) throw new Error('watch necesita partyAddress y partyCountAddress confirmadas en config.local.json.')
  if (process.env.MELONDS_GDB_PORT) config.port = Number(process.env.MELONDS_GDB_PORT)
  reader = new GdbReader({ ...config, onStatus: message => console.log(message) })
  const features = await reader.connect()
  console.log(`GDB conectado a 127.0.0.1:${config.port}. Capacidades: ${features || '(sin anunciar)'}`)
  if (command === 'probe') {
    const bytes = await reader.readMemory(0x02000000, 16)
    console.log(`RAM 0x02000000: ${bytes.toString('hex')}`)
    console.log('Conexión y lectura comprobadas. Esto todavía no confirma direcciones del equipo ni ausencia de pausas.')
  } else if (command === 'dump' || command === 'locate') {
    const probe = await reader.readMemory(0x02000000, 16)
    console.log(`Lectura inicial correcta: ${probe.toString('hex')}. El volcado continúa en esta misma conexión.`)
    const start = Number(config.ramStart)
    const size = Number(config.ramSize)
    let save
    if (command === 'locate') {
      if (!config.savePath) throw new Error('locate necesita savePath como referencia de identidad, leído sin modificarlo.')
      save = await readFile(resolve(root, config.savePath))
    }
    console.log(`Leyendo ${size} bytes de RAM; un volcado completo puede tardar y afectar a la fluidez.`)
    const ram = await reader.readMemory(start, size)
    await mkdir(resolve(root, 'artifacts'), { recursive: true })
    const filename = resolve(root, 'artifacts', `ram-${Date.now()}.bin`)
    await writeFile(filename, ram)
    console.log(`Volcado experimental (no atómico): ${filename}`)
    if (save) {
      const candidates = locateCandidates(ram, start, save)
      const layouts = locatePartyLayouts(ram, start, save, candidates)
      const report = { candidates, layouts }
      await writeFile(`${filename}.json`, JSON.stringify(report, null, 2))
      console.log(JSON.stringify(report, null, 2))
      console.log('Son candidatos: pueden ser copias antiguas. Confirma cambios sin guardar y localiza el contador antes de usar watch.')
      if (!candidates.length) console.log('No se encontraron PK5 cifrados compatibles. La RAM puede usar otro formato; no se inventarán direcciones.')
    }
  } else if (command === 'track') {
    const folder = resolve(root, 'artifacts')
    const reports = (await readdir(folder)).filter(name => /^ram-\d+\.bin\.json$/.test(name)).sort()
    if (!reports.length) throw new Error('track necesita un informe generado por locate.')
    const report = JSON.parse(await readFile(resolve(folder, reports.at(-1)), 'utf8'))
    if (!Array.isArray(report.layouts) || !report.layouts.length) throw new Error('El informe no contiene estructuras completas de equipo.')
    if (!Number.isInteger(config.pollMs) || config.pollMs < 250 || config.pollMs > 60000) throw new Error('pollMs debe estar entre 250 y 60000.')
    const log = resolve(folder, `observations-${Date.now()}.jsonl`)
    console.log(`Observando ${report.layouts.length} candidatos. Registro: ${log}`)
    let previous
    while (!stopped) {
      const observations = []
      for (const layout of report.layouts) {
        if (stopped) break
        try {
          const party = await readParty(reader, { ...config, ...layout })
          observations.push({ partyAddress: layout.partyAddress, order: party.map(member => ({ speciesId: member.speciesId, level: member.level })) })
        } catch (error) {
          if (stopped) break
          if (reader.socket.destroyed) throw error
          observations.push({ partyAddress: layout.partyAddress, error: error.message })
        }
      }
      if (stopped) break
      const serialized = JSON.stringify(observations)
      if (serialized !== previous) {
        const entry = JSON.stringify({ updatedAt: new Date().toISOString(), observations })
        console.log(entry)
        await appendFile(log, entry + '\n')
        previous = serialized
      }
      if (!stopped) await delay(config.pollMs)
    }
  } else {
    if (!Number.isInteger(config.pollMs) || config.pollMs < 250 || config.pollMs > 60000) throw new Error('pollMs debe estar entre 250 y 60000.')
    let previous
    while (!stopped) {
      try {
        const party = await readParty(reader, config)
        const serialized = JSON.stringify(party)
        if (serialized !== previous) { console.log(JSON.stringify({ updatedAt: new Date().toISOString(), party })); previous = serialized }
      } catch (error) {
        if (stopped) break
        if (reader.socket.destroyed) throw error
        console.error(`Muestra descartada: ${error.message}`)
      }
      if (!stopped) await delay(config.pollMs)
    }
  }
} catch (error) {
  if (!stopped) {
    console.error(`Prototipo: ${error.message}`)
    console.error('Comprueba GDB ARM9 en melonDS, el puerto, que la ROM esté ejecutándose y que no haya otro depurador conectado.')
    process.exitCode = 1
  }
} finally {
  if (reader) {
    try { await reader.disconnect() }
    catch (error) { console.error(`Cierre GDB: ${error.message}`); reader.close() }
  }
}
