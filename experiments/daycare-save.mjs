import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { crc16, decryptPk5, parseStoredPk5, SAVE_SIZE } from '../bridge/parser.ts'
import { readStableSave } from '../bridge/read-save.ts'

export function inspectDaycareEntry(save, base = 0) {
  if (save.length !== SAVE_SIZE || ![0, 0x24000].includes(base)) throw new Error('Invalid BW save size or entry.')
  const block = save.subarray(base + 0x20e00, base + 0x20fcc)
  const fields = new DataView(save.buffer, save.byteOffset, save.byteLength)
  const checksum = crc16(block)
  if (checksum !== fields.getUint16(base + 0x20fce, true) || checksum !== fields.getUint16(base + 0x23f64, true)) throw new Error('Daycare checksum mismatch.')
  const slots = [0, 1].map(slot => {
    const offset = slot * 228
    const occupied = fields.getUint32(base + 0x20e00 + offset, true)
    if (![0, 1].includes(occupied)) throw new Error('Invalid daycare occupancy.')
    if (!occupied) return { slot, occupied: false, pokemon: null }
    const encrypted = block.subarray(offset + 4, offset + 224)
    const pokemon = parseStoredPk5(encrypted.subarray(0, 136))
    if (!pokemon || pokemon.isEgg) throw new Error('Invalid deposited Pokemon.')
    const storedLevelByte = decryptPk5(encrypted)[0x8c]
    return {
      slot, occupied: true,
      pokemon: { speciesId: pokemon.speciesId, nickname: pokemon.nickname, personality: pokemon.personality,
        storedLevelByte, storedExperience: pokemon.experience,
        gainedExperience: fields.getUint32(base + 0x20e00 + offset + 224, true) },
    }
  })
  return { slots, eggAvailable: Boolean(block[0x1c8] & 1) }
}

async function main() {
  const config = JSON.parse(await readFile('save.config.local.json', 'utf8'))
  const save = await readStableSave(process.env.MELONDS_SAVE_PATH ?? config.savePath)
  const entries = [0, 0x24000].map(base => {
    const entry = base === 0 ? 'main' : 'backup'
    try { return { entry, valid: true, ...inspectDaycareEntry(save, base) } }
    catch (error) { return { entry, valid: false, error: error.message } }
  })
  console.log(JSON.stringify({ sampledAt: new Date().toISOString(), entries }, null, 2))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
