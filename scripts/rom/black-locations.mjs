// Format references and scope: docs/es/rom-locations.md.
// These parsers only inspect bytes; they never modify the input.
function region(bytes, offset, length) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > bytes.length) throw new Error('Truncated ROM data')
  return bytes.subarray(offset, offset + length)
}

export function readNitroFile(rom, path) {
  region(rom, 0, 0x160)
  const fnt = region(rom, rom.readUInt32LE(0x40), rom.readUInt32LE(0x44))
  const fat = region(rom, rom.readUInt32LE(0x48), rom.readUInt32LE(0x4c))
  const parts = path.split('/')
  let directory = 0
  for (let depth = 0; depth < parts.length; depth++) {
    const entry = region(fnt, directory * 8, 8)
    let cursor = entry.readUInt32LE(0)
    let fileId = entry.readUInt16LE(4)
    let found = false
    while (true) {
      const descriptor = region(fnt, cursor++, 1)[0]
      if (!descriptor) break
      const isDirectory = (descriptor & 0x80) !== 0
      const length = descriptor & 0x7f
      const name = region(fnt, cursor, length).toString('ascii')
      cursor += length
      const child = isDirectory ? region(fnt, cursor, 2).readUInt16LE(0) : fileId++
      if (isDirectory) cursor += 2
      if (name !== parts[depth]) continue
      if (isDirectory && depth < parts.length - 1) {
        if (child < 0xf000) throw new Error('Invalid Nitro directory')
        directory = child - 0xf000
        found = true
        break
      }
      if (!isDirectory && depth === parts.length - 1) {
        const allocation = region(fat, child * 8, 8)
        const start = allocation.readUInt32LE(0)
        return region(rom, start, allocation.readUInt32LE(4) - start)
      }
      throw new Error('Invalid Nitro path')
    }
    if (!found) throw new Error(`ROM file not found: ${path}`)
  }
  throw new Error(`ROM file not found: ${path}`)
}

export function readNarc(bytes) {
  if (region(bytes, 0, 4).toString('ascii') !== 'NARC') throw new Error('Invalid NARC signature')
  region(bytes, 0, 16)
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('Invalid NARC size')
  let cursor = bytes.readUInt16LE(12)
  let allocation
  let data
  for (let i = 0; i < bytes.readUInt16LE(14); i++) {
    const header = region(bytes, cursor, 8)
    const size = header.readUInt32LE(4)
    if (size < 8) throw new Error('Invalid NARC chunk')
    const chunk = region(bytes, cursor + 8, size - 8)
    const magic = header.toString('ascii', 0, 4)
    if (magic === 'BTAF') allocation = chunk
    if (magic === 'GMIF') data = chunk
    cursor += size
  }
  if (!allocation || !data || cursor !== bytes.length) throw new Error('Missing NARC chunks')
  const count = region(allocation, 0, 4).readUInt16LE(0)
  return Array.from({ length: count }, (_, i) => {
    const entry = region(allocation, 4 + i * 8, 8)
    const start = entry.readUInt32LE(0)
    return region(data, start, entry.readUInt32LE(4) - start)
  })
}

export function readLocationNames(bytes) {
  region(bytes, 0, 16)
  if (bytes.readUInt16LE(0) < 1) throw new Error('Missing text section')
  const count = bytes.readUInt16LE(2)
  const base = bytes.readUInt32LE(12)
  const section = region(bytes, base, region(bytes, base, 4).readUInt32LE(0))
  return Array.from({ length: count }, (_, i) => {
    const entry = region(section, 4 + i * 8, 8)
    const words = region(section, entry.readUInt32LE(0), entry.readUInt16LE(4) * 2)
    if (!words.length) throw new Error('Empty encrypted text')
    let key = words.readUInt16LE(words.length - 2) ^ 0xffff
    const decoded = []
    for (let cursor = words.length - 2; cursor >= 0; cursor -= 2) {
      decoded.unshift(words.readUInt16LE(cursor) ^ key)
      key = ((key >>> 3) | (key << 13)) & 0xffff
    }
    if (decoded[0] === 0xf100) throw new Error('Compressed location text is not supported')
    return decoded.filter(word => word !== 0xffff).map(word => {
      if (word < 0x20 || word > 0xfff0) return `\\u${word.toString(16).padStart(4, '0')}`
      return String.fromCharCode(word)
    }).join('')
  })
}

export function extractBlackLocations(rom) {
  region(rom, 0, 0x160)
  const gameCode = rom.toString('ascii', 12, 16)
  const revision = rom[0x1e]
  if (gameCode !== 'IRBS' || revision !== 0) throw new Error('Only Spanish Black IRBS revision 0 is validated')
  const headers = readNarc(readNitroFile(rom, 'a/0/1/2'))[0]
  if (!headers?.length || headers.length % 48) throw new Error('Invalid Black map header table')
  const text = readNarc(readNitroFile(rom, 'a/0/0/2'))[89]
  if (!text) throw new Error('Missing location name bank')
  const names = readLocationNames(text)
  const maps = Array.from({ length: headers.length / 48 }, (_, mapId) => {
    const row = headers.subarray(mapId * 48, (mapId + 1) * 48)
    const nameId = row[0x1a]
    if (names[nameId] === undefined) throw new Error('Map references a missing location name')
    return { mapId, nameId, name: names[nameId], encounterId: row.readUInt16LE(0x14), mapField: row.readUInt16LE(0x16), parentField: row.readUInt16LE(0x18) }
  })
  return { gameCode, revision, maps }
}
