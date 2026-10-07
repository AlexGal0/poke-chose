// Candidate search only. Matching an internal map number never proves a live map.
export function findMapCandidates(bytes, ramStart, mapId) {
  if (!Number.isInteger(mapId) || mapId < 0 || mapId > 0xffff) throw new Error('Mapa de búsqueda inválido.')
  if (!Number.isInteger(ramStart) || ramStart < 0x02000000 || ramStart + bytes.length > 0x02400000) throw new Error('Región RAM inválida.')
  const fields = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const addresses = []
  for (let offset = ramStart % 2; offset + 2 <= bytes.length; offset += 2) {
    if (fields.getUint16(offset, true) === mapId) addresses.push(ramStart + offset)
  }
  return addresses
}

export async function sampleMapCandidates(reader, addresses) {
  // Group nearby candidates to avoid one GDB round trip per number.
  const pages = new Map()
  for (const address of addresses) {
    if (!Number.isInteger(address) || address % 2 || address < 0x02000000 || address + 2 > 0x02400000) throw new Error('Candidato fuera de RAM.')
    const page = address - address % 256
    if (!pages.has(page)) pages.set(page, [])
    pages.get(page).push(address)
  }
  const results = []
  for (const [page, candidates] of pages) {
    const first = await reader.readMemory(page, 256)
    const second = await reader.readMemory(page, 256)
    if (first.length !== 256 || second.length !== 256) throw new Error('Lectura RAM incompleta.')
    for (const address of candidates) {
      const offset = address - page
      const value = second.readUInt16LE(offset)
      results.push({ address, value, stable: value === first.readUInt16LE(offset) })
    }
  }
  return results
}
