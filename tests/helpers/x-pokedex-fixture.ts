// Synthetic main containing only the two blocks consumed by the Pokédex reader.
// Fixture CRC uses a byte lookup table, independently of the production bit loop.
export function fixtureCrc(bytes: Uint8Array): number {
  const table = Array.from({ length: 256 }, (_, value) => {
    let crc = value << 8
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    return crc & 0xffff
  })
  let value = 0xffff
  for (const byte of bytes) value = ((value << 8) ^ table[((value >>> 8) ^ byte) & 255]) & 0xffff
  return value
}
export function refreshXChecksums(bytes: Buffer) {
  for (const [id, start, length] of [[17, 0x14000, 0x170], [20, 0x15000, 0x6a0]]) {
    const offset = 0x65414 + id * 8
    bytes.writeUInt32LE(length, offset)
    bytes.writeUInt16LE(id, offset + 4)
    bytes.writeUInt16LE(fixtureCrc(bytes.subarray(start, start + length)), offset + 6)
  }
}
export function xPokedexFixture(options: { caught?: number[]; foreign?: number[]; seen?: number[][]; displayed?: number[]; game?: number } = {}): Buffer {
  const bytes = Buffer.alloc(0x65600)
  bytes.writeUInt32LE(0x42454546, 0x65410)
  bytes[0x14004] = options.game ?? 24
  const set = (offset: number, speciesId: number) => {
    const bit = speciesId - 1
    bytes[0x15000 + offset + (bit >> 3)] |= 1 << (bit & 7)
  }
  for (const species of options.caught ?? []) set(8, species)
  for (const species of options.foreign ?? []) set(0x64c, species)
  for (const [region, species] of (options.seen ?? []).entries()) for (const id of species) set(0x68 + region * 0x60, id)
  for (const species of options.displayed ?? []) set(0x1e8, species)
  refreshXChecksums(bytes)
  return bytes
}
