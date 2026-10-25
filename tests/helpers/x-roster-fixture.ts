import { xPokedexFixture, fixtureCrc } from './x-pokedex-fixture.ts'

// Independently encrypt with BigInt arithmetic and write blocks in inverse order.
const layouts = ['ABCD', 'ABDC', 'ACBD', 'ADBC', 'ACDB', 'ADCB', 'BACD', 'BADC', 'CABD', 'DABC', 'CADB', 'DACB', 'BCAD', 'BDAC', 'CBAD', 'DBAC', 'CDAB', 'DCAB', 'BCDA', 'BDCA', 'CBDA', 'DBCA', 'CDBA', 'DCBA']
export function fixturePk6(options: { speciesId?: number; form?: number; constant?: number; egg?: boolean; nickname?: string; level?: number; party?: boolean; hp?: number; experience?: number; gender?: 'male' | 'female' | 'genderless'; hatchCycles?: number; handler?: number } = {}) {
  const bytes = Buffer.alloc(options.party ? 260 : 232)
  const constant = options.constant ?? 0x12345678
  bytes.writeUInt32LE(constant, 0)
  bytes.writeUInt16LE(options.speciesId ?? 653, 8)
  bytes.writeUInt16LE(17, 0xa)
  bytes.writeUInt32LE(0x11223344, 0xc)
  bytes.writeUInt32LE(options.experience ?? 1000, 0x10)
  bytes[0x14] = 66
  bytes.writeUInt32LE(0xabcdef01, 0x18)
  bytes[0x1c] = 12
  bytes[0x1d] = ((options.form ?? 0) << 3) | ((options.gender === 'male' ? 0 : options.gender === 'genderless' ? 2 : 1) << 1)
  bytes.writeUInt16LE(33, 0x5a)
  bytes.writeUInt16LE(52, 0x5c)
  let iv = options.egg ? 0x40000000 : 0
  if (options.nickname) { bytes.write(options.nickname, 0x40, 24, 'utf16le'); iv = (iv | 0x80000000) >>> 0 }
  bytes.writeUInt32LE(iv, 0x74)
  bytes[0xca] = options.hatchCycles ?? 20
  bytes[0x93] = options.handler ?? 0
  bytes[0xa2] = 99
  let checksum = 0
  for (let i = 8; i < 232; i += 2) checksum += bytes.readUInt16LE(i)
  bytes.writeUInt16LE(checksum & 0xffff, 6)
  if (options.party) {
    bytes[0xec] = options.level ?? 10
    bytes.writeUInt16LE(options.hp ?? 15, 0xf0)
    for (let i = 0xf2; i <= 0xfc; i += 2) bytes.writeUInt16LE(30, i)
  }
  const canonical = Buffer.from(bytes)
  const layout = layouts[((constant >>> 13) & 31) % 24]
  for (let block = 0; block < 4; block++) canonical.copy(bytes, 8 + (layout.charCodeAt(block) - 65) * 56, 8 + block * 56, 8 + (block + 1) * 56)
  for (const [start, end] of [[8, 232], [232, bytes.length]]) {
    let seed = BigInt(constant)
    for (let offset = start; offset < end; offset += 2) {
      seed = (seed * 1103515245n + 24691n) & 0xffffffffn
      bytes.writeUInt16LE(bytes.readUInt16LE(offset) ^ Number(seed >> 16n), offset)
    }
  }
  return bytes
}
export function refreshRosterChecksums(bytes: Buffer) {
  for (const [id, offset, length] of [[18, 0x14200, 0x61c], [53, 0x22600, 0x34ad0]]) {
    const metadata = 0x65414 + id * 8
    bytes.writeUInt32LE(length, metadata)
    bytes.writeUInt16LE(id, metadata + 4)
    bytes.writeUInt16LE(fixtureCrc(bytes.subarray(offset, offset + length)), metadata + 6)
  }
}
export function xRosterFixture() {
  const bytes = xPokedexFixture({ caught: [653], seen: [[653]] })
  fixturePk6({ party: true, nickname: 'DoceLetrasXY' }).copy(bytes, 0x14200)
  bytes[0x14200 + 6 * 260] = 1
  fixturePk6({ speciesId: 700 }).copy(bytes, 0x22600 + (30 * 30 + 29) * 232)
  refreshRosterChecksums(bytes)
  return bytes
}
