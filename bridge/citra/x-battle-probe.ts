import type { MemoryReader } from '../../src/games/x/memory-party.ts'
import { readXMemoryMember } from '../../src/games/x/memory-party.ts'
import { X_BATTLE_STATE_ADDRESS, X_BATTLE_STAGES_OFFSET, decodeXBattleStages } from '../../src/games/x/memory-battle.ts'

// Research only. Codes.cpp/GetBattleParty indexes six consecutive pointers;
// Helpers.cpp/SetBattleOffset supplies the two bases. The rival bases are the
// existing individually validated pointers, expanded as an explicit hypothesis.
export const X_BATTLE_PROBE_TABLES = [
  { side: 'own', copy: 0, address: 0x081fb284 },
  { side: 'own', copy: 1, address: 0x081fb624 },
  { side: 'enemy', copy: 0, address: 0x081fb2a0 },
  { side: 'enemy', copy: 1, address: 0x081fb640 },
] as const

export interface ProbeRosterMember { slot: number; speciesId: number; maxHp: number }

async function exact(reader: MemoryReader, address: number, length: number) {
  const bytes = await reader.read(address, length)
  if (bytes.length !== length) throw new Error('Incomplete X battle probe read')
  // Readers may return a view into a buffer that changes on the next request.
  return Uint8Array.from(bytes)
}

export async function probeXBattleTables(reader: MemoryReader) {
  async function header() {
    const flag = await exact(reader, X_BATTLE_STATE_ADDRESS, 4)
    const tables = await Promise.all(X_BATTLE_PROBE_TABLES.map(async table => {
      const bytes = await exact(reader, table.address, 28)
      const view = new DataView(bytes.buffer)
      return { ...table, pointers: Array.from({ length: 6 }, (_, slot) => view.getUint32(slot * 4, true)),
        // Adjacent word, NOT a validated count or format identifier.
        followingWordCandidate: view.getUint32(24, true) }
    }))
    return { flag: new DataView(flag.buffer).getUint32(0, true), tables }
  }
  async function pass() {
    const before = await header()
    const tables = await Promise.all(before.tables.map(async table => ({
      ...table,
      slots: await Promise.all(table.pointers.map(async (pointer, slot) => {
        const base = { slot, pointer }
        // Outside battle these tables can contain reused memory. Never follow
        // pointers then, and never describe a zero pointer as a confirmed vacancy.
        if (before.flag !== 0x40001) return { ...base, state: 'not-in-active-battle' as const }
        if (!pointer) return { ...base, state: 'zero-pointer' as const }
        if (pointer < 0x08000000 || pointer > 0x08df0000 - X_BATTLE_STAGES_OFFSET - 7) return { ...base, state: 'invalid-pointer' as const }
        const bytes = await exact(reader, pointer, 18)
        const view = new DataView(bytes.buffer)
        // Three scalar header candidates, deliberately not decoded as identity,
        // side or field position until contrasted with real switches.
        const headerCandidates = { word0: view.getUint32(0, true), word4: view.getUint32(4, true), word8: view.getUint32(8, true) }
        const speciesId = view.getUint16(12, true), maxHp = view.getUint16(14, true), currentHp = view.getUint16(16, true)
        if (speciesId < 1 || speciesId > 721 || maxHp === 0 || currentHp > maxHp) return { ...base, state: 'invalid-vitals' as const }
        const stages = decodeXBattleStages(await exact(reader, pointer + X_BATTLE_STAGES_OFFSET, 7))
        return { ...base, state: 'candidate' as const, headerCandidates, speciesId, currentHp, maxHp, stages }
      })),
    })))
    if (JSON.stringify(before) !== JSON.stringify(await header())) throw new Error('X battle probe header changed')
    return { flag: before.flag, tables }
  }
  const first = await pass(), second = await pass()
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('X battle probe changed between passes')
  return { stable: true as const, ...second }
}

// Fixed-size context immediately preceding the known tables, in both copies.
// Return only references to observed participant pointers, not raw context bytes.
export async function probeXBattleReferences(reader: MemoryReader, tables: Awaited<ReturnType<typeof probeXBattleTables>>) {
  if (tables.flag !== 0x40001) return []
  const windows = [0x081fb170, 0x081fb510]
  const references = []
  for (const [copy, address] of windows.entries()) {
    const first = await exact(reader, address, 0x114)
    const second = await exact(reader, address, 0x114)
    if (!first.every((byte, index) => byte === second[index])) throw new Error('X battle probe context changed')
    const view = new DataView(first.buffer)
    for (let offset = 0; offset < first.length; offset += 4) {
      const value = view.getUint32(offset, true)
      if (!value) continue
      for (const table of tables.tables.filter(table => table.copy === copy)) {
        for (const slot of table.slots) {
          if (slot.state === 'candidate' && slot.pointer === value) references.push({ address: address + offset, copy, sideCandidate: table.side, slot: slot.slot })
        }
      }
    }
  }
  return references
}

// Hypothesis: the first word of a statistics record links to the existing PK6
// object layout. Verify its internal pointers and checksum before using it.
export async function probeXBattleIdentity(reader: MemoryReader, object: number) {
  if (!Number.isInteger(object) || object < 0x08000000 || object > 0x08df0000 - 430) throw new Error('Invalid X battle identity candidate')
  const bytes = await exact(reader, object, 12)
  const view = new DataView(bytes.buffer)
  const core = view.getUint32(4, true), stats = view.getUint32(8, true)
  if (core !== object + 64 || stats !== core + 344) throw new Error('Invalid X battle identity links')
  const member = await readXMemoryMember(reader, core, 0)
  const after = await exact(reader, object, 12)
  if (!bytes.every((byte, index) => byte === after[index])) throw new Error('X battle identity links changed')
  return member
}

// Small scalar candidates in two fixed context windows. Values are hypotheses,
// never decoded as format or field positions by the production reader.
export async function probeXBattleContext(reader: MemoryReader) {
  const windows = [0x081fb140, 0x081fb4e0]
  const copies: DataView[] = []
  for (const address of windows) {
    const first = await exact(reader, address, 0x240)
    const second = await exact(reader, address, 0x240)
    if (!first.every((byte, index) => byte === second[index])) throw new Error('X battle scalar context changed')
    copies.push(new DataView(first.buffer))
  }
  const candidates = []
  for (let offset = 0; offset < 0x240; offset += 4) {
    const values = copies.map(view => view.getUint32(offset, true))
    if (values.some(value => value > 0 && value <= 6)) candidates.push({ address: windows[0] + offset, mirrorCandidateAddress: windows[1] + offset, values })
  }
  return candidates
}

// A single bounded window enclosing the already known battle structures.
// Exclude the roster tables themselves and output only matching references.
export async function probeXBattleAliases(reader: MemoryReader, tables: Awaited<ReturnType<typeof probeXBattleTables>>) {
  if (tables.flag !== 0x40001) return []
  const address = 0x081fb000, length = 0x800
  const first = await exact(reader, address, length), second = await exact(reader, address, length)
  if (!first.every((byte, index) => byte === second[index])) throw new Error('X battle alias context changed')
  const view = new DataView(first.buffer)
  const aliases = []
  for (let offset = 0; offset < length; offset += 4) {
    const at = address + offset
    if (X_BATTLE_PROBE_TABLES.some(table => at >= table.address && at < table.address + 28)) continue
    const value = view.getUint32(offset, true)
    if (!value) continue
    for (const table of tables.tables) for (const slot of table.slots) {
      if (slot.state !== 'candidate') continue
      if (slot.pointer === value || slot.headerCandidates.word0 === value) aliases.push({ address: at, sideCandidate: table.side, copy: table.copy, slot: slot.slot,
        target: slot.pointer === value ? 'statistics' : 'pk6-object' })
    }
  }
  return aliases
}

// Fixed arena around the already validated battle tables. Emit only references
// to known participants, never raw memory or arbitrary process-wide searches.
export async function probeXBattleArenaReferences(reader: MemoryReader, tables: Awaited<ReturnType<typeof probeXBattleTables>>) {
  if (tables.flag !== 0x40001) return []
  const references = []
  for (let address = 0x081f8000; address < 0x081fc000; address += 0x1000) {
    const first = await exact(reader, address, 0x1000), second = await exact(reader, address, 0x1000)
    const a = new DataView(first.buffer), b = new DataView(second.buffer)
    for (let offset = 0; offset < first.length; offset += 4) {
      const value = a.getUint32(offset, true)
      if (!value || value !== b.getUint32(offset, true)) continue
      for (const table of tables.tables) for (const slot of table.slots) {
        if (slot.state !== 'candidate') continue
        if (slot.pointer === value || slot.headerCandidates.word0 === value) references.push({ address: address + offset, side: table.side, copy: table.copy, slot: slot.slot,
          target: slot.pointer === value ? 'statistics' : 'pk6-object' })
      }
    }
  }
  return references
}

// Record stride observed locally: 0x244. Contrast the first two roster entries
// against four reserves without interpreting any candidate byte as an active bit.
export async function probeXBattleSlotContrast(reader: MemoryReader, tables: Awaited<ReturnType<typeof probeXBattleTables>>, leadingOwnCount: 1 | 2 = 2) {
  if (tables.flag !== 0x40001) return []
  const own = tables.tables.filter(table => table.side === 'own')
  if (!own.every(table => table.slots.every(slot => slot.state === 'candidate' && slot.pointer <= 0x08df0000 - 0x244))) return []
  const copies: Uint8Array[][] = []
  for (const table of own) {
    const records = []
    for (const slot of table.slots) {
      const first = await exact(reader, slot.pointer, 0x244), second = await exact(reader, slot.pointer, 0x244)
      if (!first.every((byte, index) => byte === second[index])) throw new Error('X battle slot contrast changed')
      records.push(first)
    }
    copies.push(records)
  }
  const candidates = []
  for (let offset = 0; offset < 0x244; offset++) {
    const values = copies[0].map(record => record[offset])
    if (!values.every((value, index) => copies[1][index][offset] === value)) continue
    const first = values.slice(0, leadingOwnCount), reserve = values.slice(leadingOwnCount)
    const booleanContrast = values.every(value => value <= 1) && first.every(value => value === first[0]) && reserve.every(value => value === reserve[0]) && first[0] !== reserve[0]
    const indexContrast = first.every(value => value <= 5) && reserve.every(value => value === reserve[0] && value > 5)
    if (booleanContrast || indexContrast) candidates.push({ offset, values })
  }
  return candidates
}

// Diagnostic ambiguity is explicit: a roster match is not an identity mapping.
export function probeRosterMatches(candidate: { speciesId: number; maxHp: number }, roster: readonly ProbeRosterMember[] | null) {
  return roster === null ? null : roster.filter(member => member.speciesId === candidate.speciesId && member.maxHp === candidate.maxHp).map(member => member.slot)
}

export async function probeXBattleMetadataSample(reader: MemoryReader) {
  const first = await exact(reader, 0x081fb000, 0x800), second = await exact(reader, 0x081fb000, 0x800)
  if (!first.every((byte, index) => byte === second[index])) throw new Error('X battle metadata is changing')
  return first
}

// Only changed scalar hypotheses; never output the memory window itself.
export function compareXBattleMetadata(before: Uint8Array, after: Uint8Array) {
  if (before.length !== 0x800 || after.length !== 0x800) throw new Error('Invalid X battle metadata sample')
  const previous = new DataView(before.buffer, before.byteOffset, before.byteLength)
  const next = new DataView(after.buffer, after.byteOffset, after.byteLength)
  const changes = []
  for (let offset = 0; offset < 0x800; offset += 4) {
    const from = previous.getUint32(offset, true), to = next.getUint32(offset, true)
    const ramPointer = (value: number) => value >= 0x08000000 && value <= 0x08df0000 && value % 4 === 0
    if (from !== to && !ramPointer(from) && !ramPointer(to)) changes.push({ address: 0x081fb000 + offset, before: from, after: to })
  }
  return changes
}
