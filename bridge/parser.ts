import type { SavedBoxPokemon, SavedPartyMember, SavedPokemonData } from '../src/models/party.ts'
import type { PokedexState } from '../src/models/pokedex.ts'
import { parsePokedexBlock, POKEDEX_LENGTH, POKEDEX_OFFSET } from './pokedex.ts'
import type { PlayerPosition } from '../src/models/player-position.ts'
import { parsePlayerPositionBlock, POSITION_LENGTH, POSITION_OFFSET } from './player-position.ts'

export const SAVE_SIZE = 0x80000
const PARTY_OFFSET = 0x18e00
const PARTY_LENGTH = 0x534
const PK5_SIZE = 220
export const STORED_PK5_SIZE = 136
export const BOX_COUNT = 24
export const BOX_SLOTS = 30

// Independent implementation of the documented binary format. See docs/save-format.md.
export function crc16(data: Uint8Array): number {
  let crc = 0xffff
  for (const byte of data) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff
  }
  return crc
}

function view(data: Uint8Array) { return new DataView(data.buffer, data.byteOffset, data.byteLength) }

function decryptWords(data: Uint8Array, seed: number) {
  const words = view(data)
  for (let offset = 0; offset < data.length; offset += 2) {
    seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0
    words.setUint16(offset, words.getUint16(offset, true) ^ (seed >>> 16), true)
  }
}

// Lexicographic permutation at index ((PID >> 13) & 31) % 24.
function blockOrder(index: number): number[] {
  const remaining = [0, 1, 2, 3]
  return [6, 2, 1, 1].map(factor => {
    const position = Math.floor(index / factor)
    index %= factor
    return remaining.splice(position, 1)[0]
  })
}

export function decryptPk5(encrypted: Uint8Array): Uint8Array {
  if (encrypted.length !== PK5_SIZE && encrypted.length !== STORED_PK5_SIZE) throw new Error('PK5 incompleto: se necesitan 136 o 220 bytes.')
  const data = Uint8Array.from(encrypted)
  const header = view(data)
  const personality = header.getUint32(0, true)
  const checksum = header.getUint16(6, true)
  decryptWords(data.subarray(8, 136), checksum)
  decryptWords(data.subarray(136), personality)
  let total = 0
  for (let offset = 8; offset < 136; offset += 2) total = (total + header.getUint16(offset, true)) & 0xffff
  if (total !== checksum) throw new Error('Checksum PK5 inválido.')
  const shuffled = data.slice(8, 136)
  blockOrder(((personality >>> 13) & 31) % 24).forEach((canonicalBlock, storedBlock) => {
    data.set(shuffled.subarray(storedBlock * 32, storedBlock * 32 + 32), 8 + canonicalBlock * 32)
  })
  return data
}

function parsePokemonData(data: Uint8Array): SavedPokemonData {
  const fields = view(data)
  const speciesId = fields.getUint16(8, true)
  if (fields.getUint16(4, true) !== 0 || speciesId < 1 || speciesId > 649) {
    throw new Error('Especie PK5 inválida.')
  }
  const natureId = data[0x41]
  if (natureId > 24) throw new Error('Naturaleza PK5 inválida.')
  return {
    natureId,
    speciesId, personality: fields.getUint32(0, true), trainerId: fields.getUint32(0x0c, true),
    heldItemId: fields.getUint16(0x0a, true), abilityId: data[0x15],
    moveIds: [0x28, 0x2a, 0x2c, 0x2e].map(offset => fields.getUint16(offset, true)) as SavedPartyMember['moveIds'],
    form: data[0x40] >>> 3, isEgg: (fields.getUint32(0x38, true) & 0x40000000) !== 0,
    nickname: (fields.getUint32(0x38, true) & 0x80000000) !== 0 ? readNickname(fields) : null,
  }
}

// PK5 custom-name flag and UTF-16LE buffer; trailing bytes are not part of the name.
function readNickname(fields: DataView): string | null {
  const codes: number[] = []
  for (let offset = 0x48; offset < 0x5c; offset += 2) {
    const code = fields.getUint16(offset, true)
    if (code === 0 || code === 0xffff) break
    codes.push(code === 0x246d ? 0x2642 : code === 0x246e ? 0x2640 : code)
  }
  const nickname = String.fromCharCode(...codes)
  return nickname.trim() && !codes.some(code => code < 32 || code === 127) ? nickname : null
}

export function parsePk5(encrypted: Uint8Array, slot = 0): SavedPartyMember {
  if (encrypted.length !== PK5_SIZE) throw new Error('PK5 del party incompleto: se necesitan 220 bytes.')
  const data = decryptPk5(encrypted)
  const level = data[0x8c]
  if (level < 1 || level > 100) throw new Error('Nivel PK5 inválido.')
  const fields = view(data)
  const currentHp = fields.getUint16(0x8e, true)
  const maxHp = fields.getUint16(0x90, true)
  if (currentHp > maxHp) throw new Error('PS PK5 inválidos.')
  return {
    ...parsePokemonData(data), slot, level, currentHp, maxHp, experience: fields.getUint32(0x10, true),
    currentStats: {
      hp: maxHp,
      attack: fields.getUint16(0x92, true),
      defense: fields.getUint16(0x94, true),
      speed: fields.getUint16(0x96, true),
      'special-attack': fields.getUint16(0x98, true),
      'special-defense': fields.getUint16(0x9a, true),
    },
  }
}

export function parseStoredPk5(encrypted: Uint8Array): SavedPokemonData | null {
  if (encrypted.length !== STORED_PK5_SIZE) throw new Error('PK5 de caja incompleto: se necesitan 136 bytes.')
  if (encrypted.every(byte => byte === 0)) return null
  const data = decryptPk5(encrypted)
  // Games can store cleared slots as encrypted empty structures as well.
  if (view(data).getUint16(8, true) === 0 && view(data).getUint16(4, true) === 0) return null
  return parsePokemonData(data)
}

function parseEntry(save: Uint8Array, base: number): { party: SavedPartyMember[]; boxes: SavedBoxPokemon[]; pokedex: PokedexState; position: PlayerPosition | null } {
  const fields = view(save)
  const checksum = (offset: number, length: number, stored: number, mirror?: number) => {
    const actual = crc16(save.subarray(base + offset, base + offset + length))
    if (actual !== fields.getUint16(base + stored, true) || (mirror !== undefined && actual !== fields.getUint16(base + mirror, true))) {
      throw new Error('Save BW inválido o escritura incompleta: checksum de bloque incorrecto.')
    }
  }
  checksum(0x23f00, 0x8c, 0x23f9a)
  checksum(PARTY_OFFSET, PARTY_LENGTH, 0x19336, 0x23f34)
  checksum(0x19400, 0x68, 0x1946a, 0x23f36)
  checksum(POKEDEX_OFFSET, POKEDEX_LENGTH, 0x21ad6, 0x23f6e)
  const game = save[base + 0x1941f]
  if (game !== 21) throw new Error('Solo se admite Pokémon Black, no White ni Black 2/White 2.')
  const count = save[base + PARTY_OFFSET + 4]
  if (count > 6) throw new Error('Cantidad de miembros del party inválida.')
  const party = Array.from({ length: count }, (_, slot) => {
    const start = base + PARTY_OFFSET + 8 + slot * PK5_SIZE
    return parsePk5(save.subarray(start, start + PK5_SIZE), slot)
  })
  const boxes: SavedBoxPokemon[] = []
  for (let box = 0; box < BOX_COUNT; box++) {
    const offset = 0x400 + box * 0x1000
    checksum(offset, 0xff0, offset + 0xff2, 0x23f02 + box * 2)
    for (let slot = 0; slot < BOX_SLOTS; slot++) {
      const start = base + offset + slot * STORED_PK5_SIZE
      const member = parseStoredPk5(save.subarray(start, start + STORED_PK5_SIZE))
      if (member) boxes.push({ ...member, box, slot })
    }
  }
  // Optional position failure must not discard valid Pokémon or mix save entries.
  let position: PlayerPosition | null = null
  try {
    checksum(POSITION_OFFSET, POSITION_LENGTH, 0x1959e, 0x23f38)
    position = parsePlayerPositionBlock(save.subarray(base + POSITION_OFFSET, base + POSITION_OFFSET + POSITION_LENGTH))
  } catch { /* Location unavailable; retain the valid core entry. */ }
  return { party, boxes, position, pokedex: parsePokedexBlock(save.subarray(base + POKEDEX_OFFSET, base + POKEDEX_OFFSET + POKEDEX_LENGTH)) }
}

export function parseSave(save: Uint8Array, allowBackup = true): { party: SavedPartyMember[]; boxes: SavedBoxPokemon[]; pokedex: PokedexState; position: PlayerPosition | null; backup: boolean } {
  if (save.length !== SAVE_SIZE) throw new Error('Save inválido: se necesita un .sav RAW de 512 KiB (524288 bytes).')
  try { return { ...parseEntry(save, 0), backup: false } } catch (primaryError) {
    if (allowBackup) {
      try { return { ...parseEntry(save, 0x24000), backup: true } } catch { /* Report primary failure. */ }
    }
    throw primaryError
  }
}
