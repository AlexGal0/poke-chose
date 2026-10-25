import { readPartyPk6 } from './pk6.ts'

export interface MemoryReader { read(address: number, length: number): Promise<Uint8Array> }
// Candidate for the installed X session, not a version-independent address.
export const X_MEMORY_PARTY_CANDIDATE = { firstMember: 0x08ce1ce8, stride: 484, statsOffset: 344, countAddress: 0x08ce1c74, tableAddress: 0x08ce1c5c }
export interface XMemoryPartyProfile { firstMember: number; stride: number; statsOffset: number; countAddress: number; tableAddress: number }

export async function readXMemoryMember(reader: MemoryReader, address: number, slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 5 || !Number.isInteger(address) || address < 0 || address + 366 > 0x100000000) throw new Error('Invalid X member range')
  async function sample() {
    const core = await reader.read(address, 232)
    const stats = await reader.read(address + 344, 22)
    if (core.length !== 232 || stats.length !== 22) throw new Error('Incomplete X memory member')
    // Reconstruct the encrypted PK6 party layout; only the first 22 tail bytes
    // contain fields consumed by readPartyPk6. The remaining padding is unused.
    const bytes = new Uint8Array(260)
    bytes.set(core)
    bytes.set(stats, 232)
    return bytes
  }
  const first = await sample()
  const second = await sample()
  if (!first.every((byte, i) => byte === second[i])) throw new Error('X memory member changed during read')
  return readPartyPk6(first, slot)
}

// Experimental profile: a valid byte/count alone does not identify game version
// or prove the title/session is in a supported state. The session reader checks its fingerprint.
export async function readXMemoryParty(reader: MemoryReader, profile: XMemoryPartyProfile = X_MEMORY_PARTY_CANDIDATE) {
  if (profile.stride !== 484 || profile.statsOffset !== 344 || !Number.isInteger(profile.countAddress) || profile.countAddress < 0 || profile.countAddress > 0xffffffff ||
    !Number.isInteger(profile.tableAddress) || profile.tableAddress < 0 || profile.tableAddress + 24 !== profile.countAddress ||
    !Number.isInteger(profile.firstMember) || profile.firstMember < 64 || profile.firstMember + 5 * profile.stride + 366 > 0x100000000) throw new Error('Invalid X memory profile')
  const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((value, i) => value === b[i])
  async function header() {
    const bytes = Uint8Array.from(await reader.read(profile.tableAddress, 25))
    if (bytes.length !== 25 || bytes[24] < 1 || bytes[24] > 6) throw new Error('Invalid X party count')
    const view = new DataView(bytes.buffer)
    const objects = Array.from({ length: bytes[24] }, (_, slot) => view.getUint32(slot * 4, true))
    const poolStart = profile.firstMember - 64
    if (new Set(objects).size !== objects.length || objects.some(address => address < poolStart || address > poolStart + 5 * profile.stride || (address - poolStart) % profile.stride !== 0)) throw new Error('Invalid X party pointer table')
    return { bytes, objects }
  }
  async function pass() {
    const before = await header()
    const members = []
    for (const [slot, object] of before.objects.entries()) {
      const pointers = Uint8Array.from(await reader.read(object, 12))
      if (pointers.length !== 12) throw new Error('Incomplete X party object')
      const view = new DataView(pointers.buffer)
      const core = view.getUint32(4, true)
      if (core !== object + 64 || view.getUint32(8, true) !== core + profile.statsOffset) throw new Error('Invalid X party object pointers')
      members.push(await readXMemoryMember(reader, core, slot))
      if (!equal(pointers, await reader.read(object, 12))) throw new Error('X party object changed during read')
    }
    if (!equal((await header()).bytes, before.bytes)) throw new Error('X party count or order changed during read')
    const identities = members.map(p => `${p.personality}:${p.trainerId}:${p.speciesId}`)
    if (new Set(identities).size !== members.length) throw new Error('Ambiguous X party identities')
    return members
  }
  const first = await pass()
  const second = await pass()
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('X party changed during read')
  return second
}
