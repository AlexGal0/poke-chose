import type { MemoryReader } from './memory-party.ts'
import type { GeneralCombatFormat } from '../core/combat.ts'
import { GENERAL_COMBAT_POSITIONS } from '../core/combat.ts'
import { X_BATTLE_STATE_ADDRESS } from './memory-battle.ts'

// Local executable profile only. The current command-layout routine is a
// discriminant, not a roster count. Unknown routines remain unconfirmed.
export const X_BATTLE_FORMAT_SELECTOR = 0x081fb238
export const X_BATTLE_FORMAT_HANDLERS = {
  single: { selector: 0x006ba7a4, ownInstruction: 0x006baa0c, enemyInstruction: 0x006baa24 },
  double: { selector: 0x006ba4bc, ownInstruction: 0x006ba72c, enemyInstruction: 0x006ba744 },
  horde: { selector: 0x006b9cb4, ownInstruction: 0x006b9f24, enemyInstruction: 0x006b9f3c },
} as const

export interface XBattleFormatReading {
  format: GeneralCombatFormat
  // Declared field capacity, including positions whose occupant has fainted.
  positions: readonly [number, number]
}

// Caller must check the session fingerprint, as for all other X memory readers.
export async function readXMemoryBattleFormat(reader: MemoryReader): Promise<XBattleFormatReading | null> {
  async function word(address: number) {
    const bytes = await reader.read(address, 4)
    if (bytes.length !== 4) throw new Error('Incomplete X battle format read')
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true)
  }
  async function header() {
    return { flag: await word(X_BATTLE_STATE_ADDRESS), selector: await word(X_BATTLE_FORMAT_SELECTOR) }
  }
  const before = await header()
  if (before.flag !== 0x40001) return null
  const format = (Object.keys(X_BATTLE_FORMAT_HANDLERS) as GeneralCombatFormat[]).find(format => X_BATTLE_FORMAT_HANDLERS[format].selector === before.selector)
  if (!format) return null
  const handler = X_BATTLE_FORMAT_HANDLERS[format]
  const positions = GENERAL_COMBAT_POSITIONS[format]
  // Verify the two ARM `mov r3, #count` instructions passed to the common
  // field-layout initializer. This rejects mismatched code/profile candidates.
  for (const [index, address] of [handler.ownInstruction, handler.enemyInstruction].entries()) {
    if (await word(address) !== (0xe3a03000 | positions[index]) >>> 0) throw new Error('X battle format instructions disagree')
  }
  const after = await header()
  if (before.flag !== after.flag || before.selector !== after.selector) throw new Error('X battle format changed during read')
  return { format, positions }
}
