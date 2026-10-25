// Read-only, bounded investigation for the locally fingerprinted X profile.
// No dumps, writes, execution controls or save modifications.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { createXSessionReader } from '../bridge/citra/x-session.ts'
import { readPk6 } from '../src/games/x/pk6.ts'
import { readXDaycareBlock } from '../src/games/x/daycare-data.ts'
import { xLevelFromExperience } from '../src/games/x/experience.ts'

const config = JSON.parse(await readFile('x-save.config.local.json', 'utf8'))
const path = process.env.CITRA_X_SAVE_PATH?.trim() || config.savePath
const hash = async () => createHash('sha256').update(await readFile(path)).digest('hex')
const before = await hash()
const session = createXSessionReader()
const rpc = new CitraRpcReader()
try {
  await session.checkProfile()
  const start = 0x08c7a8d0, end = 0x08c861b8
  const bytes = Buffer.alloc(end - start)
  for (let offset = 0; offset < bytes.length; offset += 4096) {
    const size = Math.min(4096, bytes.length - offset)
    bytes.set(await rpc.read(start + offset, size), offset)
  }
  const candidates = []
  for (let offset = 0; offset + 0x1f0 <= bytes.length; offset += 4) {
    if (bytes[offset] !== 1 || bytes[offset + 0xf0] > 1 || bytes[offset + 0x1e0] > 1) continue
    try {
      const member = readPk6(bytes.subarray(offset + 8, offset + 0xf0))
      if (member?.speciesId !== 133 || member.gender !== 'female' || member.isEgg) continue
      const address = start + offset
      const first = await rpc.read(address, 0x1f0)
      const second = await rpc.read(address, 0x1f0)
      const reading = readXDaycareBlock(second)
      candidates.push({ address: `0x${address.toString(16)}`, stable: first.equals(second),
        originalExperience: member.experience, gainedExperience: second.readUInt32LE(4),
        slots: reading.slots.map(p => p && ({ speciesId: p.speciesId, form: p.form, level: xLevelFromExperience(p.speciesId, p.experience), experience: p.experience })),
        eggAvailable: reading.eggAvailable })
    } catch { /* Only report fully decoded, checksum-valid candidates. */ }
  }
  await session.checkProfile()
  console.log(JSON.stringify({ readOnly: true, profileMatched: true, saveUnchanged: before === await hash(), candidates }, null, 2))
} finally { rpc.close(); session.close() }
