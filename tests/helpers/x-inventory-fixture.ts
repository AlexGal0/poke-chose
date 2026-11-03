import { xRosterFixture } from './x-roster-fixture.ts'
import { fixtureCrc } from './x-pokedex-fixture.ts'
export function xInventoryFixture(items: [number, number][] = [[82, 2], [646, 1]]) {
  const bytes = xRosterFixture()
  items.forEach(([id, count], slot) => { bytes.writeUInt16LE(id, 0x400 + slot * 4); bytes.writeUInt16LE(count, 0x402 + slot * 4) })
  refreshInventoryChecksum(bytes)
  return bytes
}
export function refreshInventoryChecksum(bytes: Buffer) {
  bytes.writeUInt32LE(0xb88, 0x6541c)
  bytes.writeUInt16LE(1, 0x65420)
  bytes.writeUInt16LE(fixtureCrc(bytes.subarray(0x400, 0xf88)), 0x65422)
}
