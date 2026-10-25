import type { SavedPokemonData, SavedPartyMember } from '../../models/party.ts'
import { SavePokedexError } from '../core/save-pokedex.ts'

export const PK6_STORED_SIZE = 232
export const PK6_PARTY_SIZE = 260
// The format's block permutations, indexed by bits 13..17 of the encryption constant.
const orders = ['0123', '0132', '0213', '0312', '0231', '0321', '1023', '1032', '2013', '3012', '2031', '3021', '1203', '1302', '2103', '3102', '2301', '3201', '1230', '1320', '2130', '3120', '2310', '3210']

export function decryptPk6(input: Uint8Array): Uint8Array {
  if (![PK6_STORED_SIZE, PK6_PARTY_SIZE].includes(input.length)) throw new SavePokedexError('format')
  const bytes = Uint8Array.from(input)
  const view = new DataView(bytes.buffer)
  const constant = view.getUint32(0, true)
  // Party stats start a second PRNG stream with the same seed.
  for (const [start, end] of [[8, PK6_STORED_SIZE], [PK6_STORED_SIZE, bytes.length]]) {
    let seed = constant
    for (let offset = start; offset < end; offset += 2) {
      seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0
      view.setUint16(offset, view.getUint16(offset, true) ^ (seed >>> 16), true)
    }
  }
  const shuffled = bytes.slice(8, PK6_STORED_SIZE)
  const order = orders[((constant >>> 13) & 31) % 24]
  for (let block = 0; block < 4; block++) bytes.set(shuffled.subarray(Number(order[block]) * 56, (Number(order[block]) + 1) * 56), 8 + block * 56)
  let checksum = 0
  for (let offset = 8; offset < PK6_STORED_SIZE; offset += 2) checksum = (checksum + view.getUint16(offset, true)) & 0xffff
  if (view.getUint16(4, true) !== 0 || checksum !== view.getUint16(6, true)) throw new SavePokedexError('integrity')
  return bytes
}

export function readPk6(input: Uint8Array): SavedPokemonData | null {
  // Blank slots can be either zero-filled or encrypted blank PK6 records.
  if (input.every(byte => byte === 0)) return null
  const bytes = decryptPk6(input)
  const view = new DataView(bytes.buffer)
  const speciesId = view.getUint16(8, true)
  if (speciesId === 0) return null
  const gender = (bytes[0x1d] >>> 1) & 3
  if (speciesId > 721 || bytes[0x1c] > 24 || gender > 2) throw new SavePokedexError('format')
  const isNicknamed = (view.getUint32(0x74, true) >>> 31) !== 0
  const isEgg = Boolean(view.getUint32(0x74, true) & 0x40000000)
  const nickname = new TextDecoder('utf-16le').decode(bytes.subarray(0x40, 0x58)).split('\0')[0]
    .replaceAll('\ue08e', '♂').replaceAll('\ue08f', '♀')
  if (isNicknamed && (!nickname.trim() || [...nickname].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) throw new SavePokedexError('format')
  return { speciesId, personality: view.getUint32(0x18, true), trainerId: view.getUint32(0xc, true),
    heldItemId: view.getUint16(0xa, true), abilityId: bytes[0x14], experience: view.getUint32(0x10, true),
    moveIds: [0x5a, 0x5c, 0x5e, 0x60].map(offset => view.getUint16(offset, true)) as SavedPokemonData['moveIds'],
    natureId: bytes[0x1c], gender: (['male', 'female', 'genderless'] as const)[gender], form: bytes[0x1d] >>> 3,
    isEgg, ...(isEgg ? { hatchCyclesRemaining: bytes[0xca] } : {}), nickname: isNicknamed ? nickname : null }
}

export function readPartyPk6(input: Uint8Array, slot: number): SavedPartyMember {
  const pokemon = readPk6(input)
  if (!pokemon) throw new SavePokedexError('format')
  const bytes = decryptPk6(input)
  const view = new DataView(bytes.buffer)
  const hp = view.getUint16(0xf2, true)
  const currentHp = view.getUint16(0xf0, true)
  const level = bytes[0xec]
  if (level < 1 || level > 100 || currentHp > hp) throw new SavePokedexError('format')
  return { ...pokemon, slot, level, currentHp, maxHp: hp, currentStats: { hp,
    attack: view.getUint16(0xf4, true), defense: view.getUint16(0xf6, true), speed: view.getUint16(0xf8, true),
    'special-attack': view.getUint16(0xfa, true), 'special-defense': view.getUint16(0xfc, true) } }
}
