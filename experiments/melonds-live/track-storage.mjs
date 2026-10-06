import { readFile, appendFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { GdbReader } from './gdb.mjs'
import { readBoxes, readPokedex } from './storage.mjs'

const root = new URL('./', import.meta.url)
const config = JSON.parse(await readFile(new URL('config.local.json', root), 'utf8'))
if (process.env.MELONDS_GDB_PORT) config.port = Number(process.env.MELONDS_GDB_PORT)
const report = JSON.parse(await readFile(new URL('artifacts/storage-candidates.json', root), 'utf8'))
const reader = new GdbReader({ ...config, onStatus: console.log })
let stopped = false
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stopped = true; reader.close() })
const log = new URL(`artifacts/storage-observations-${Date.now()}.jsonl`, root)
try {
  await reader.connect()
  console.log(`Seguimiento experimental de cajas y Pokédex por puerto ${config.port}; no son direcciones confirmadas. Registro: ${log.pathname}`)
  let previous
  while (!stopped) {
    const observations = []
    for (const candidate of [...report.layouts, ...report.pokedex]) {
      try {
        const data = candidate.boxesAddress ? { boxes: await readBoxes(reader, candidate) } : { pokedex: await readPokedex(reader, candidate) }
        observations.push({ candidate, ...data })
      } catch (error) {
        if (stopped) break
        if (reader.socket.destroyed) throw error
        observations.push({ candidate, error: error.message })
      }
    }
    if (stopped) break
    const current = JSON.stringify(observations)
    if (current !== previous) {
      const entry = JSON.stringify({ updatedAt: new Date().toISOString(), observations })
      await appendFile(log, entry + '\n')
      console.log(entry)
      previous = current
    }
    await delay(10000)
  }
} catch (error) {
  if (!stopped) { console.error(error.message); process.exitCode = 1 }
} finally {
  try { await reader.disconnect() } catch { reader.close() }
}
