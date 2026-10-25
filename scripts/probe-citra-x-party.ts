// Bounded local diagnostics. Never publishes raw PK6 data or private identifiers.
import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { setTimeout as delay } from 'node:timers/promises'
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { readXMemoryParty } from '../src/games/x/memory-party.ts'
import { readXSavePokemon } from '../src/games/x/save-pokedex.ts'
import type { SavedPartyMember } from '../src/models/party.ts'

const args = process.argv.slice(2)
const samples = args.length === 0 ? 1 : args.length === 1 && /^--samples=\d+$/.test(args[0]) ? Number(args[0].split('=')[1]) : 0
if (!Number.isInteger(samples) || samples < 1 || samples > 30) throw new Error('Use --samples=1..30 (two seconds between samples)')
let saved: SavedPartyMember[] | null = null
let config: { savePath?: string } = {}
try { config = JSON.parse(await readFile('x-save.config.local.json', 'utf8')) }
catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error }
const path = process.env.CITRA_X_SAVE_PATH?.trim() || config.savePath
if (path) saved = readXSavePokemon(await readFile(path)).party
const baseline = saved ? JSON.stringify(saved) : null
const identity = (p: SavedPartyMember) => `${p.speciesId}:${p.personality}:${p.trainerId}`
const reader = new CitraRpcReader()
let previous: string | null = null
try {
  for (let sample = 0; sample < samples; sample++) {
    if (sample) await delay(2000)
    const start = performance.now()
    try {
      const party = await readXMemoryParty(reader)
      const current = JSON.stringify(party)
      console.log(JSON.stringify({ sample: sample + 1, valid: true, experimental: true, readOnly: true, count: party.length,
        members: party.map(p => ({ slot: p.slot + 1, speciesId: p.speciesId, level: p.level, currentHp: p.currentHp, maxHp: p.maxHp })),
        memoryReadMs: Number((performance.now() - start).toFixed(2)), changedSincePrevious: previous === null ? null : previous !== current,
        saveComparison: saved ? { countMatches: saved.length === party.length, orderedIdentitiesMatch: saved.length === party.length && party.every((p, i) => identity(p) === identity(saved![i])),
          allFieldsMatch: current === baseline, stillDiffersFromBaseline: current !== baseline } : null }))
      previous = current
    } catch (error) {
      console.log(JSON.stringify({ sample: sample + 1, valid: false, error: error instanceof Error ? error.message : 'Read failed' }))
      process.exitCode = 1
    }
  }
  if (path && baseline !== null) {
    const final = readXSavePokemon(await readFile(path)).party
    console.log(JSON.stringify({ savePartyUnchangedDuringProbe: JSON.stringify(final) === baseline }))
  }
} finally { reader.close() }
