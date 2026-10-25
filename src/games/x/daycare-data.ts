import { readPk6 } from './pk6.ts'
import { SavePokedexError } from '../core/save-pokedex.ts'
import type { DaycareData } from '../core/daycare.ts'

export const X_DAYCARE_BLOCK = { id: 38, offset: 0x1b200, length: 0x1f0 } as const

// Format reference: PKHeX Daycare6XY, documented in docs/es/x-daycare.md.
export function readXDaycareBlock(bytes: Uint8Array): DaycareData {
  if (bytes.length !== X_DAYCARE_BLOCK.length) throw new SavePokedexError('size')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes[0x1e0] > 1) throw new SavePokedexError('format')
  const slots = [0, 0xf0].map(offset => {
    if (bytes[offset] > 1) throw new SavePokedexError('format')
    // Withdrawal leaves old PK6 bytes behind. Only the occupancy flag confirms a slot.
    if (bytes[offset] === 0) return null
    const member = readPk6(bytes.subarray(offset + 8, offset + 0xf0))
    if (!member || member.isEgg || member.experience === undefined) throw new SavePokedexError('format')
    const experience = member.experience + view.getUint32(offset + 4, true)
    if (experience > 0xffffffff) throw new SavePokedexError('format')
    return { speciesId: member.speciesId, form: member.form, nickname: member.nickname, gender: member.gender, experience }
  })
  return { slots, eggAvailable: bytes[0x1e0] === 1 }
}
