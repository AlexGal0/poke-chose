import { fixturePk6, xRosterFixture } from './x-roster-fixture.ts'
import { fixtureCrc } from './x-pokedex-fixture.ts'

export function daycareBlock(options: { empty?: boolean; egg?: boolean; second?: boolean; gained?: number; experience?: number; speciesId?: number } = {}) {
  const bytes = Buffer.alloc(0x1f0)
  if (!options.empty) {
    for (const offset of options.second ? [0, 0xf0] : [0]) {
      bytes[offset] = 1
      bytes.writeUInt32LE(options.gained ?? 68, offset + 4)
      fixturePk6({ speciesId: options.speciesId ?? 133, experience: options.experience ?? 6859 }).copy(bytes, offset + 8)
    }
  }
  bytes[0x1e0] = options.egg ? 1 : 0
  return bytes
}
export function refreshDaycareChecksum(bytes: Buffer) {
  const metadata = 0x65414 + 38 * 8
  bytes.writeUInt32LE(0x1f0, metadata)
  bytes.writeUInt16LE(38, metadata + 4)
  bytes.writeUInt16LE(fixtureCrc(bytes.subarray(0x1b200, 0x1b3f0)), metadata + 6)
}
export function xDaycareFixture(options: Parameters<typeof daycareBlock>[0] = {}) {
  const bytes = xRosterFixture()
  daycareBlock(options).copy(bytes, 0x1b200)
  refreshDaycareChecksum(bytes)
  return bytes
}
