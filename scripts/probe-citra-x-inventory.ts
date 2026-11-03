// Read-only diagnostic. Save and guest bytes stay in RAM; only addresses/counts are printed.
import { readXItemsPocket } from '../src/games/x/inventory.ts'
import { readFile } from 'node:fs/promises'
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { createXSessionReader } from '../bridge/citra/x-session.ts'
const rpc = new CitraRpcReader(), profile = createXSessionReader()
try {
  const path = process.env.CITRA_X_SAVE_PATH ?? JSON.parse(await readFile('x-save.config.local.json', 'utf8')).savePath
  const save = await readFile(path)
  const needle = save.subarray(0x400, 0x440)
  if (save.length !== 0x65600 || needle.every(byte => byte === 0)) throw new Error('Need a configured X save with a nonempty bag')
  await profile.checkProfile()
  const start = 0x08c64000, length = 0x4000
  const region = Buffer.alloc(length)
  for (let offset = 0; offset < length; offset += 4096) region.set(await rpc.read(start + offset, 4096), offset)
  const matches: number[] = []
  for (let offset = 0; offset <= region.length - needle.length; offset += 4) if (region.subarray(offset, offset + needle.length).equals(needle)) matches.push(start + offset)
  for (const address of matches) {
    const first = await rpc.read(address, 0x640), second = await rpc.read(address, 0x640)
    const items = readXItemsPocket(first)
    console.log(JSON.stringify({ sample: items.filter(item => [80, 81, 82, 83, 84, 85, 107, 108, 109, 110, 646, 647].includes(item.gameIndex)), address: `0x${address.toString(16)}`, stable: first.equals(second), matchesSavedPocket: first.equals(save.subarray(0x400, 0xa40)), occupied: Array.from({ length: 400 }, (_, slot) => first.readUInt16LE(slot * 4)).filter(Boolean).length }))
  }
  console.log(JSON.stringify({ matches: matches.length }))
  await profile.checkProfile()
} finally { rpc.close(); profile.close() }
