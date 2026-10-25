import type { PokedexState } from '../../models/pokedex.ts'
import type { SavedPartyMember, SavedBoxPokemon } from '../../models/party.ts'
import type { DaycareData } from './daycare.ts'

export type SavePokedexErrorCode = 'size' | 'format' | 'integrity' | 'game'
export class SavePokedexError extends Error {
  readonly code: SavePokedexErrorCode
  constructor(code: SavePokedexErrorCode) {
    super(code)
    this.code = code
  }
}
export interface SavePokedexReader {
  byteLength: number
  parse(bytes: Uint8Array): PokedexState
  parsePokemon?(bytes: Uint8Array): { party: SavedPartyMember[]; boxes: SavedBoxPokemon[] }
  parseDaycare?(bytes: Uint8Array): DaycareData
}

// CRC-16/CCITT-FALSE: polynomial 0x1021, init 0xffff, no reflection/xorout.
export function crc16Ccitt(bytes: Uint8Array): number {
  let crc = 0xffff
  for (const byte of bytes) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff
  }
  return crc
}
