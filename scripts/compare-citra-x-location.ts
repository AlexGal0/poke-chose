// Diagnostic snapshots stay in this process's RAM. No memory dumps, game writes or save access.
import { createInterface } from 'node:readline/promises'
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { createXSessionReader } from '../bridge/citra/x-session.ts'

const rpc = new CitraRpcReader(), profile = createXSessionReader()
const input = createInterface({ input: process.stdin, output: process.stdout })
const start = 0x08c60000, length = 0x20000
async function snapshot() {
  await profile.checkProfile()
  const data = Buffer.alloc(length)
  for (let offset = 0; offset < length; offset += 4096) data.set(await rpc.read(start + offset, 4096), offset)
  await profile.checkProfile()
  return data
}
try {
  let previous = await snapshot()
  console.log('BASELINE_READY: 128 KiB diagnostic region retained only in process RAM')
  let candidates: number[] | null = null
  for (let stage = 1; stage <= 6; stage++) {
    const label = await input.question('Enter zone label after moving, or quit: ')
    if (label.trim() === 'quit') break
    const first = await snapshot(), next = await snapshot()
    const offsets: number[] = candidates ?? Array.from({ length: length / 2 }, (_, index) => index * 2)
    candidates = offsets.filter(offset => {
      const before = previous.readUInt16LE(offset), after = next.readUInt16LE(offset)
      return before > 0 && before < 2048 && after > 0 && after < 2048 && before !== after && after === first.readUInt16LE(offset)
    })
    console.log(JSON.stringify({ stage, label, count: candidates.length, candidates: candidates.slice(0, 100).map(offset => ({ address: `0x${(start + offset).toString(16)}`, before: previous.readUInt16LE(offset), after: next.readUInt16LE(offset) })) }, null, 2))
    previous = next
  }
} finally { input.close(); rpc.close(); profile.close() }
