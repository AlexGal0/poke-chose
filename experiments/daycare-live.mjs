import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { GdbReader } from '../bridge/live/gdb.mjs'
import { parseDaycareBlock, parseSave } from '../bridge/parser.ts'
import { readStableSave } from '../bridge/read-save.ts'

// Candidate derived from the relative save-block layout; never treated as confirmed.
const config = JSON.parse(await readFile('live.config.local.json', 'utf8'))
const saveConfig = JSON.parse(await readFile('save.config.local.json', 'utf8'))
const address = Number(config.pokedexAddress) - 0x800
const reader = new GdbReader(config)
const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
async function sample() {
  const first = await reader.readMemory(address, 460)
  const second = await reader.readMemory(address, 460)
  if (!first.equals(second)) throw new Error('Unstable daycare candidate.')
  const daycare = parseDaycareBlock(first)
  const reference = parseSave(await readStableSave(process.env.MELONDS_SAVE_PATH ?? saveConfig.savePath)).daycare
  const summary = state => ({ eggAvailable: state.eggAvailable, slots: state.slots.map(p => p && ({ speciesId: p.speciesId, personality: p.personality, experience: p.experience, gainedExperience: p.gainedExperience })) })
  console.log(JSON.stringify({ sampledAt: new Date().toISOString(), candidateAddress: `0x${address.toString(16)}`, confirmedLive: false,
    live: summary(daycare), save: reference && summary(reference), matchesSave: JSON.stringify(daycare) === JSON.stringify(reference) }))
}
try {
  await reader.connect()
  await sample()
  console.log('Commands: sample, quit. One read-only GDB connection stays open.')
  for await (const line of input) {
    if (line.trim() === 'quit') break
    if (line.trim() === 'sample') {
      try { await sample() } catch (error) { console.error(error.message) }
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally { input.close(); await reader.disconnect() }
