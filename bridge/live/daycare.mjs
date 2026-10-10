import { parseDaycareBlock } from '../parser.ts'

export async function readDaycare(reader, config) {
  if (config.daycareAddress == null) return null
  const address = Number(config.daycareAddress)
  if (!Number.isSafeInteger(address) || address % 4 || address < 0x02000000 || address + 460 > 0x02400000) throw new Error('Invalid daycare RAM address.')
  const first = await reader.readMemory(address, 460)
  const second = await reader.readMemory(address, 460)
  if (first.length !== 460 || second.length !== 460 || !Buffer.from(first).equals(Buffer.from(second))) throw new Error('Unstable daycare sample.')
  return parseDaycareBlock(second)
}
