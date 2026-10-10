const RAM_START = 0x02000000
const RAM_END = 0x02400000

// Research only: a match or stable byte is never a confirmed live counter.
export function repelResearchRegion(config) {
  const base = Number(config.pokedexAddress) - 0x21600
  if (base + 0x18e08 !== Number(config.partyAddress) || base + 0x400 !== Number(config.boxesAddress)) {
    throw new Error('Las direcciones conocidas no comparten la distribución BW; no se puede inferir esta región.')
  }
  const address = base + 0x21b00
  if (!Number.isSafeInteger(address) || address < RAM_START || address + 0x34 > RAM_END) throw new Error('Región de investigación fuera de RAM.')
  return { address, length: 0x34 }
}

export function compareRepelSamples(first, second, address, previous = null) {
  if (!Number.isSafeInteger(address) || address < RAM_START || address + second.length > RAM_END || first.length !== 0x34 || second.length !== 0x34 || (previous && previous.length !== 0x34)) {
    throw new Error('Muestra de investigación incompleta o fuera de RAM.')
  }
  const stable = first.every((byte, index) => byte === second[index])
  const changes = previous ? [...second].flatMap((value, offset) => value === previous[offset] ? [] : [{ address: `0x${(address + offset).toString(16)}`, offset, before: previous[offset], value }]) : []
  return { address: `0x${address.toString(16)}`, stable, changes, tail: [...second.subarray(0x2c)], confirmedLive: false }
}
