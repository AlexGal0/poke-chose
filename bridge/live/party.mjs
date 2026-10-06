import { parsePk5, parseSave } from '../parser.ts'

export async function readParty(reader, config) {
  const address = Number(config.partyAddress)
  const countAddress = Number(config.partyCountAddress)
  const stride = config.partyStride
  if (!config.partyAddress || !config.partyCountAddress || !Number.isInteger(stride) || stride < 220 || stride > 1024) throw new Error('Configura direcciones del equipo y contador validadas; stride entre 220 y 1024.')
  // Do not assume the live party has the save's offsets or representation.
  const countBefore = await reader.readMemory(countAddress, 4)
  const count = countBefore.readUInt32LE()
  if (count < 1 || count > 6) throw new Error('Contador no válido para una partida cargada (1–6).')
  const size = (count - 1) * stride + 220
  const first = await reader.readMemory(address, size)
  const second = await reader.readMemory(address, size)
  const countAfter = await reader.readMemory(countAddress, 4)
  if (!first.equals(second) || !countBefore.equals(countAfter)) throw new Error('El equipo cambió durante la lectura; se descarta la muestra.')
  return Array.from({ length: count }, (_, slot) => parsePk5(first.subarray(slot * stride, slot * stride + 220), slot))
}

export function locateCandidates(ram, ramStart, save) {
  const reference = parseSave(save)
  // Match PID/trainer/species rather than a fixed address from another ROM region.
  const wanted = reference.party
  const candidates = []
  for (let offset = 0; offset <= ram.length - 220; offset += 4) {
    if (!wanted.some(member => member.personality === ram.readUInt32LE(offset))) continue
    try {
      const member = parsePk5(ram.subarray(offset, offset + 220))
      const slot = wanted.findIndex(reference => reference.personality === member.personality && reference.trainerId === member.trainerId && reference.speciesId === member.speciesId)
      if (slot >= 0) candidates.push({ address: `0x${(ramStart + offset).toString(16)}`, referenceSlot: slot, speciesId: member.speciesId, level: member.level })
    } catch { /* RAM may contain decrypted data, transient values or unrelated copies. */ }
  }
  return candidates
}

export function locatePartyLayouts(ram, ramStart, save, candidates = locateCandidates(ram, ramStart, save)) {
  const reference = parseSave(save).party
  const layouts = []
  for (const candidate of candidates.filter(candidate => candidate.referenceSlot === 0)) {
    const offset = Number(candidate.address) - ramStart
    if (offset < 8 || offset + reference.length * 220 > ram.length) continue
    // A hypothesis for a Party header: capacity followed by current count.
    // Validate every member instead of promoting an isolated Pokémon match.
    if (ram.readUInt32LE(offset - 8) !== 6 || ram.readUInt32LE(offset - 4) !== reference.length) continue
    try {
      const party = reference.map((expected, slot) => {
        const actual = parsePk5(ram.subarray(offset + slot * 220, offset + (slot + 1) * 220), slot)
        if (actual.personality !== expected.personality || actual.trainerId !== expected.trainerId || actual.speciesId !== expected.speciesId) throw new Error('Identidad del equipo distinta.')
        return actual
      })
      layouts.push({ partyAddress: candidate.address, partyCountAddress: `0x${(ramStart + offset - 4).toString(16)}`, partyStride: 220, party, confirmedLive: false })
    } catch { /* Reject incomplete teams, unrelated copies and unsupported layouts. */ }
  }
  return layouts
}
