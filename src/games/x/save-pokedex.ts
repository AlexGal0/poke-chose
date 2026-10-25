import { readXPokedexFlags } from './pokedex-flags.ts'
import type { PokedexState } from '../../models/pokedex.ts'
import { crc16Ccitt, SavePokedexError } from '../core/save-pokedex.ts'
import type { SavePokedexReader } from '../core/save-pokedex.ts'
import { readPk6, readPartyPk6, PK6_PARTY_SIZE, PK6_STORED_SIZE } from './pk6.ts'
import type { SavedBoxPokemon } from '../../models/party.ts'
import { X_DAYCARE_BLOCK, readXDaycareBlock } from './daycare-data.ts'

export const X_SAVE_SIZE = 0x65600
const METADATA = X_SAVE_SIZE - 0x200
const STATUS = { id: 17, offset: 0x14000, length: 0x170 }
const DEX = { id: 20, offset: 0x15000, length: 0x6a0 }
const PARTY = { id: 18, offset: 0x14200, length: 0x61c }
const BOXES = { id: 53, offset: 0x22600, length: 0x34ad0 }

function validateBlock(bytes: Uint8Array, block: { id: number; offset: number; length: number }) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const metadata = METADATA + 0x14 + block.id * 8
  if (view.getUint32(metadata, true) !== block.length || view.getUint16(metadata + 4, true) !== block.id) throw new SavePokedexError('format')
  if (crc16Ccitt(bytes.subarray(block.offset, block.offset + block.length)) !== view.getUint16(metadata + 6, true)) throw new SavePokedexError('integrity')
}

// Binary format references and validation scope: docs/es/x-save-pokedex.md.
// Pokédex reader remains independently available; the full reader below adds PK6 records.
export function readXSavePokedex(bytes: Uint8Array): PokedexState {
  if (bytes.byteLength !== X_SAVE_SIZE) throw new SavePokedexError('size')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(METADATA + 0x10, true) !== 0x42454546) throw new SavePokedexError('format')
  for (const block of [STATUS, DEX]) validateBlock(bytes, block)
  // Save version is independent of the origin version of individual Pokémon.
  if (bytes[STATUS.offset + 4] !== 24) throw new SavePokedexError('game')
  return readXPokedexFlags(bytes.subarray(DEX.offset, DEX.offset + DEX.length))
}

export const xSavePokedexReader: SavePokedexReader = { byteLength: X_SAVE_SIZE, parse: readXSavePokedex }

export function readXSavePokemon(bytes: Uint8Array) {
  readXSavePokedex(bytes)
  for (const block of [PARTY, BOXES]) validateBlock(bytes, block)
  const count = bytes[PARTY.offset + 6 * PK6_PARTY_SIZE]
  if (count > 6) throw new SavePokedexError('format')
  const party = Array.from({ length: count }, (_, slot) => readPartyPk6(bytes.subarray(PARTY.offset + slot * PK6_PARTY_SIZE, PARTY.offset + (slot + 1) * PK6_PARTY_SIZE), slot))
  const boxes: SavedBoxPokemon[] = []
  for (let box = 0; box < 31; box++) for (let slot = 0; slot < 30; slot++) {
    const offset = BOXES.offset + (box * 30 + slot) * PK6_STORED_SIZE
    const pokemon = readPk6(bytes.subarray(offset, offset + PK6_STORED_SIZE))
    if (pokemon) boxes.push({ ...pokemon, box, slot })
  }
  return { party, boxes }
}
export function readXSaveDaycare(bytes: Uint8Array) {
  readXSavePokedex(bytes)
  validateBlock(bytes, X_DAYCARE_BLOCK)
  return readXDaycareBlock(bytes.subarray(X_DAYCARE_BLOCK.offset, X_DAYCARE_BLOCK.offset + X_DAYCARE_BLOCK.length))
}
export const xSaveReader: SavePokedexReader = { ...xSavePokedexReader, parsePokemon: readXSavePokemon, parseDaycare: readXSaveDaycare }
