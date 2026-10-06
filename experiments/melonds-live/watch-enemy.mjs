import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises'
import { createEnemyServer } from './enemy-server.mjs'
import { locateEnemyCandidates } from './enemy.mjs'
import { readOwnBattle } from './active-pokemon.mjs'
import { readEnemyVitals, readEnemyBattle } from './battle-vitals.mjs'
import { readParty } from '../../bridge/live/party.mjs'
import { readBattlePresence } from './battle-tables.mjs'

const reportPath = process.argv[2] ?? '--battle'
const useBattleFields = reportPath === '--battle'
const discoverySpecies = reportPath === '--discover' ? Number(process.argv[3]) : null
if (discoverySpecies !== null && (!Number.isInteger(discoverySpecies) || discoverySpecies < 1 || discoverySpecies > 649)) throw new Error('Especie inválida (1–649).')
const report = discoverySpecies === null && !useBattleFields ? JSON.parse(await readFile(reportPath, 'utf8')) : null
if (report && (!Array.isArray(report.candidates) || !report.candidates.length || report.candidates.length > 32)) throw new Error('Informe sin candidatos válidos (máximo 32).')
const config = JSON.parse(await readFile('live.config.local.json', 'utf8'))
const log = `experiments/melonds-live/artifacts/enemy-observations-${Date.now()}.jsonl`
const researchRoot = `experiments/melonds-live/artifacts/active-research-${Date.now()}`
let captureNumber = 0
await mkdir('experiments/melonds-live/artifacts', { recursive: true })
const bridge = createEnemyServer({
  readerOptions: { ...config, port: Number(process.env.MELONDS_GDB_PORT ?? 3333) },
  addresses: report?.candidates.map(candidate => Number(candidate.address)) ?? [],
  readOwnBattle: async reader => readOwnBattle(reader, JSON.parse(await readFile('live.config.local.json', 'utf8'))),
  readBattlePresence: async reader => readBattlePresence(reader, JSON.parse(await readFile('live.config.local.json', 'utf8'))),
  readEnemyVitals: async (reader, candidates) => readEnemyVitals(reader, JSON.parse(await readFile('live.config.local.json', 'utf8')), candidates),
  ...(useBattleFields ? { readEnemyBattle: async reader => readEnemyBattle(reader, JSON.parse(await readFile('live.config.local.json', 'utf8'))) } : {}),
  async research(reader) {
    await mkdir(researchRoot, { recursive: true })
    const party = await readParty(reader, config)
    const ram = await reader.readMemory(0x02260000, 0x20000)
    const filename = `${researchRoot}/capture-${++captureNumber}`
    await writeFile(`${filename}.bin`, ram)
    await writeFile(`${filename}.json`, JSON.stringify({ ramStart: '0x02260000', party }, null, 2))
    return { file: `${filename}.bin`, ramStart: '0x02260000' }
  },
  async discover(reader) {
    console.log('Leyendo 4 MiB para descubrir candidatos. Mantén el encuentro abierto; puede afectar a la fluidez.')
    const ram = await reader.readMemory(0x02000000, 0x400000)
    const candidates = locateEnemyCandidates(ram, 0x02000000, discoverySpecies)
    await writeFile(`experiments/melonds-live/artifacts/enemy-discovery-${Date.now()}.json`, JSON.stringify({ speciesId: discoverySpecies, candidates, confirmedOpponent: false }, null, 2))
    return candidates.map(candidate => Number(candidate.address))
  },
  async onSample(snapshot) {
    const entry = JSON.stringify(snapshot)
    await appendFile(log, entry + '\n')
    console.log(entry)
  },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void bridge.close() })
bridge.server.on('error', error => { console.error(error.message); void bridge.close(); process.exitCode = 1 })
bridge.server.listen(3003, '127.0.0.1', () => {
  console.log('Prototipo enemigo en 127.0.0.1:3003. ' + log)
  if (!process.argv.includes('--wait')) void bridge.connect().catch(error => console.error(error.message))
})
