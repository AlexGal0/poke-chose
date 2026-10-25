// Read-only diagnostic: prints normalized counts and positions, never raw buffers.
import { readFile } from 'node:fs/promises'
import { readXSavePokemon } from '../src/games/x/save-pokedex.ts'
import { createXSessionReader } from '../bridge/citra/x-session.ts'
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { readXMemoryBoxes } from '../src/games/x/memory-boxes.ts'
const config = JSON.parse(await readFile('x-save.config.local.json', 'utf8'))
const path = process.env.CITRA_X_SAVE_PATH?.trim() || config.savePath
const savedBytes = await readFile(path)
const savedBoxes = readXSavePokemon(savedBytes).boxes
const session = createXSessionReader()
const rpc = new CitraRpcReader()
try {
  await session.read()
  const start = performance.now()
  const boxes = await readXMemoryBoxes(rpc)
  console.log(JSON.stringify({ readOnly: true, candidate: '0x08C861B8', count: boxes.length, saveUnchanged: savedBytes.equals(await readFile(path)),
    sameSavedPositions: JSON.stringify(boxes.map(p => [p.personality, p.trainerId, p.box, p.slot])) === JSON.stringify(savedBoxes.map(p => [p.personality, p.trainerId, p.box, p.slot])),
    populatedBoxes: Array.from({ length: 31 }, (_, box) => ({ box: box + 1, count: boxes.filter(p => p.box === box).length })).filter(row => row.count > 0),
    firstBox: boxes.filter(p => p.box === 0).map(p => ({ slot: p.slot + 1, speciesId: p.speciesId })), elapsedMs: Math.round(performance.now() - start) }, null, 2))
} finally { session.close(); rpc.close() }
