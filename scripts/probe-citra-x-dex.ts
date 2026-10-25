// Read-only diagnostic for the locally fingerprinted X session. No raw dumps.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createXSessionReader } from '../bridge/citra/x-session.ts'
import { readXSavePokedex } from '../src/games/x/save-pokedex.ts'

const config = JSON.parse(await readFile('x-save.config.local.json', 'utf8'))
const path = process.env.CITRA_X_SAVE_PATH?.trim() || config.savePath
const before = await readFile(path)
const saved = readXSavePokedex(before)
const reader = createXSessionReader()
try {
  const started = performance.now()
  const { pokedex } = await reader.read()
  const after = await readFile(path)
  console.log(JSON.stringify({ readOnly: true, address: '0x08C7A8D0',
    seen: pokedex.seenSpeciesIds.length, caught: pokedex.caughtSpeciesIds.length,
    seenSinceSave: pokedex.seenSpeciesIds.filter(id => !saved.seenSpeciesIds.has(id)),
    caughtSinceSave: pokedex.caughtSpeciesIds.filter(id => !saved.caughtSpeciesIds.has(id)),
    saveUnchanged: createHash('sha256').update(before).digest('hex') === createHash('sha256').update(after).digest('hex'),
    elapsedMs: Math.round(performance.now() - started),
  }, null, 2))
} finally { reader.close() }
