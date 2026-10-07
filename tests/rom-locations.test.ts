import test from 'node:test'
import assert from 'node:assert/strict'
import { extractBlackLocations, readLocationNames, readNarc, readNitroFile } from '../scripts/rom/black-locations.mjs'
import { matchRomLocations } from '../scripts/rom/match-locations.mjs'

function textBank(names: string[]) {
  const base = 16
  const tableSize = 4 + names.length * 8
  const size = tableSize + names.reduce((sum, name) => sum + (name.length + 1) * 2, 0)
  const bytes = Buffer.alloc(base + size)
  bytes.writeUInt16LE(1, 0)
  bytes.writeUInt16LE(names.length, 2)
  bytes.writeUInt32LE(size, 4)
  bytes.writeUInt32LE(base, 12)
  bytes.writeUInt32LE(size, base)
  let cursor = tableSize
  names.forEach((name, i) => {
    const words = [...name].map(char => char.charCodeAt(0)).concat(0xffff)
    bytes.writeUInt32LE(cursor, base + 4 + i * 8)
    bytes.writeUInt16LE(words.length, base + 8 + i * 8)
    let key = 0x4321
    for (let j = words.length - 1; j >= 0; j--) {
      bytes.writeUInt16LE(words[j] ^ key, base + cursor + j * 2)
      key = ((key >>> 3) | (key << 13)) & 0xffff
    }
    cursor += words.length * 2
  })
  return bytes
}

function narc(files: Buffer[]) {
  const allocation = Buffer.alloc(12 + files.length * 8)
  allocation.write('BTAF')
  allocation.writeUInt32LE(allocation.length, 4)
  allocation.writeUInt16LE(files.length, 8)
  let cursor = 0
  files.forEach((file, i) => {
    allocation.writeUInt32LE(cursor, 12 + i * 8)
    cursor += file.length
    allocation.writeUInt32LE(cursor, 16 + i * 8)
  })
  const names = Buffer.alloc(8)
  names.write('BTNF')
  names.writeUInt32LE(8, 4)
  const image = Buffer.alloc(8 + cursor)
  image.write('GMIF')
  image.writeUInt32LE(image.length, 4)
  Buffer.concat(files).copy(image, 8)
  const header = Buffer.alloc(16)
  header.write('NARC')
  header.writeUInt32LE(16 + allocation.length + names.length + image.length, 8)
  header.writeUInt16LE(16, 12)
  header.writeUInt16LE(3, 14)
  return Buffer.concat([header, allocation, names, image])
}

function romFixture() {
  const headers = Buffer.alloc(2 * 48)
  headers[0x1a] = 1
  headers[48 + 0x1a] = 1
  headers.writeUInt16LE(0xffff, 48 + 0x14)
  headers.writeUInt16LE(1, 48 + 0x16)
  const texts = Array.from({ length: 90 }, () => Buffer.alloc(0))
  texts[89] = textBank(['', 'Ciudad sintética'])
  const files = [narc(texts), narc([headers])]
  // Five directories: root/a/0/{0,1}; each leaf contains file "2".
  const fnt = Buffer.alloc(80)
  const lists = [Buffer.from([0x81, 97, 1, 0xf0, 0]), Buffer.from([0x81, 48, 2, 0xf0, 0]), Buffer.from([0x81, 48, 3, 0xf0, 0x81, 49, 4, 0xf0, 0]), Buffer.from([1, 50, 0]), Buffer.from([1, 50, 0])]
  let cursor = 40
  lists.forEach((list, i) => {
    fnt.writeUInt32LE(cursor, i * 8)
    fnt.writeUInt16LE(i === 4 ? 1 : 0, i * 8 + 4)
    list.copy(fnt, cursor)
    cursor += list.length
  })
  const rom = Buffer.alloc(0x220 + files[0].length + files[1].length)
  rom.write('IRBS', 12)
  rom.writeUInt32LE(0x160, 0x40)
  rom.writeUInt32LE(fnt.length, 0x44)
  rom.writeUInt32LE(0x200, 0x48)
  rom.writeUInt32LE(16, 0x4c)
  fnt.copy(rom, 0x160)
  cursor = 0x220
  files.forEach((file, i) => {
    rom.writeUInt32LE(cursor, 0x200 + i * 8)
    file.copy(rom, cursor)
    cursor += file.length
    rom.writeUInt32LE(cursor, 0x204 + i * 8)
  })
  return rom
}

test('extracts map names and separate raw relationship fields from a synthetic Nitro ROM', () => {
  const rom = romFixture()
  const original = Buffer.from(rom)
  assert.deepEqual(extractBlackLocations(rom), { gameCode: 'IRBS', revision: 0, maps: [
    { mapId: 0, nameId: 1, name: 'Ciudad sintética', encounterId: 0, mapField: 0, parentField: 0 },
    { mapId: 1, nameId: 1, name: 'Ciudad sintética', encounterId: 65535, mapField: 1, parentField: 0 },
  ] })
  assert.deepEqual(rom, original)
  assert.throws(() => readNitroFile(rom, 'a/0/2/2'), /not found/)
  rom.write('IREO', 12)
  assert.throws(() => extractBlackLocations(rom), /IRBS/)
})

test('decodes encrypted names with accents and preserves unknown controls explicitly', () => {
  assert.deepEqual(readLocationNames(textBank(['Ruta 6', 'Centro Pokémon', '\u0001'])), ['Ruta 6', 'Centro Pokémon', '\\u0001'])
  assert.throws(() => readLocationNames(textBank(['\uf100'])), /Compressed/)
  assert.throws(() => readLocationNames(Buffer.alloc(8)), /Truncated/)
})

test('rejects truncated archives, malformed allocation ranges and text references', () => {
  const archive = narc([Buffer.from('abc')])
  assert.deepEqual(readNarc(archive), [Buffer.from('abc')])
  assert.throws(() => readNarc(archive.subarray(0, archive.length - 1)), /size/)
  archive.writeUInt32LE(99, 28)
  assert.throws(() => readNarc(archive), /Truncated/)
  const text = textBank(['Ruta'])
  text.writeUInt32LE(0xffffffff, 20)
  assert.throws(() => readLocationNames(text), /Truncated/)
})

test('matches complete zone labels and explicit abbreviations without guessing ambiguous names', () => {
  const locations = [{ id: 1, name: 'city' }, { id: 2, name: 'cold' }, { id: 3, name: 'duplicate' }]
  const labels = { city: 'Ciudad sintética', cold: 'Almacenes Frigoríficos', duplicate: 'CIUDAD SINTETICA' }
  const maps = [{ mapId: 99, name: 'Ciudad sintética' }, { mapId: 100, name: 'Alm. Frigoríficos' }, { mapId: 101, name: 'Acceso' }]
  assert.deepEqual(matchRomLocations(maps, locations, labels), { groups: [{ locationId: 2, mapIds: [100] }], unresolved: [99, 101] })
  assert.deepEqual(matchRomLocations(maps, locations.slice(0, 2), labels).groups[0], { locationId: 1, mapIds: [99] })
  assert.throws(() => matchRomLocations([maps[0], maps[0]], locations, labels), /duplicate/)
})
