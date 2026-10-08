import type { Pokemon } from './pokemon.ts'
import { isPokedexSnapshot } from './pokedex.ts'
import type { PokedexSnapshot } from './pokedex.ts'
import { isPlayerPosition } from './player-position.ts'
import type { PlayerPosition } from './player-position.ts'
import { currentStatsEqual, isCurrentStats } from '../domain/stats.ts'
import type { CurrentStats } from '../domain/stats.ts'

export interface SavedPokemonData {
  personality: number
  trainerId: number
  speciesId: number
  heldItemId: number
  abilityId: number
  moveIds: [number, number, number, number]
  form: number
  isEgg: boolean
  nickname?: string | null
  // Stored Gen V nature index (0–24); absent in older snapshots.
  natureId?: number
}

export interface SavedPartyMember extends SavedPokemonData {
  slot: number
  level: number
  currentHp?: number
  maxHp?: number
  experience?: number
  currentStats?: CurrentStats
}
export interface SavedBoxPokemon extends SavedPokemonData { box: number; slot: number }
export type CollectionPokemon = Pokemon & SavedPokemonData & {
  currentStats?: CurrentStats
  currentHp?: number
  maxHp?: number
  location: 'party' | 'box'
  box: number | null
  slot: number
  level: number | null
  instanceKey: string
}

export type PartyPokemon = Pokemon & SavedPartyMember
export type SaveStatus = 'waiting' | 'ready' | 'missing' | 'error'
export interface PokemonSnapshot {
  // Optional for compatibility with bridges that do not read position yet.
  position?: PlayerPosition | null
  status: SaveStatus
  message: string
  party: SavedPartyMember[] | null
  boxes: SavedBoxPokemon[] | null
  pokedex: PokedexSnapshot | null
  updatedAt: string | null
  backup: boolean
}

// Compatibility with the existing save bridge and its consumers.
export type SaveSnapshot = PokemonSnapshot

export function isSaveSnapshot(value: unknown): value is SaveSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as SaveSnapshot
  const integer = (number: unknown, min: number, max: number) => typeof number === 'number' && Number.isInteger(number) && number >= min && number <= max
  const pokemon = (member: SavedPokemonData) => member && typeof member === 'object' && integer(member.personality, 0, 0xffffffff) &&
    integer(member.trainerId, 0, 0xffffffff) && integer(member.speciesId, 1, 649) && integer(member.heldItemId, 0, 65535) &&
    integer(member.abilityId, 0, 255) && integer(member.form, 0, 31) && typeof member.isEgg === 'boolean' &&
    (member.natureId === undefined || integer(member.natureId, 0, 24)) &&
    (member.nickname == null || (typeof member.nickname === 'string' && member.nickname.length <= 10 && member.nickname.trim().length > 0 && [...member.nickname].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127))) &&
    Array.isArray(member.moveIds) && member.moveIds.length === 4 && member.moveIds.every(id => integer(id, 0, 65535))
  return ['waiting', 'ready', 'missing', 'error'].includes(snapshot.status) && typeof snapshot.message === 'string' &&
    (snapshot.position === undefined || snapshot.position === null || isPlayerPosition(snapshot.position)) &&
    (snapshot.pokedex === null || isPokedexSnapshot(snapshot.pokedex)) &&
    (snapshot.boxes === null || (Array.isArray(snapshot.boxes) && snapshot.boxes.length <= 720 &&
      new Set(snapshot.boxes.map(member => `${member?.box}-${member?.slot}`)).size === snapshot.boxes.length &&
      snapshot.boxes.every(member => pokemon(member) && integer(member.box, 0, 23) && integer(member.slot, 0, 29)))) &&
    typeof snapshot.backup === 'boolean' && (snapshot.updatedAt === null || (typeof snapshot.updatedAt === 'string' && Number.isFinite(Date.parse(snapshot.updatedAt)))) &&
    (snapshot.party === null || (Array.isArray(snapshot.party) && snapshot.party.length <= 6 && snapshot.party.every((member, slot) =>
      pokemon(member) && member.slot === slot && integer(member.level, 1, 100) &&
      (member.experience === undefined || integer(member.experience, 0, 0xffffffff)) &&
      (member.currentStats === undefined || (isCurrentStats(member.currentStats) &&
        integer(member.maxHp, 0, 65535) && member.currentStats.hp === member.maxHp)) &&
      (member.currentHp === undefined && member.maxHp === undefined ||
        integer(member.currentHp, 0, 65535) && integer(member.maxHp, 0, 65535) && member.currentHp! <= member.maxHp!))))
}

export function boxesEqual(a: readonly SavedBoxPokemon[] | null, b: readonly SavedBoxPokemon[]): boolean {
  return a !== null && a.length === b.length && a.every((member, index) => {
    const other = b[index]
    return member.box === other.box && member.slot === other.slot && member.personality === other.personality &&
      member.trainerId === other.trainerId && member.speciesId === other.speciesId && member.heldItemId === other.heldItemId &&
      member.abilityId === other.abilityId && member.form === other.form && member.isEgg === other.isEgg && (member.nickname ?? null) === (other.nickname ?? null) &&
      member.natureId === other.natureId &&
      member.moveIds.every((move, moveIndex) => move === other.moveIds[moveIndex])
  })
}

export function partiesEqual(a: readonly SavedPartyMember[] | null, b: readonly SavedPartyMember[]): boolean {
  return a !== null && a.length === b.length && a.every((member, index) => {
    const other = b[index]
    return member.slot === other.slot && member.personality === other.personality && member.trainerId === other.trainerId &&
      member.speciesId === other.speciesId && member.level === other.level && member.heldItemId === other.heldItemId &&
      member.currentHp === other.currentHp && member.maxHp === other.maxHp && member.experience === other.experience &&
      member.natureId === other.natureId && currentStatsEqual(member.currentStats, other.currentStats) &&
      member.abilityId === other.abilityId && member.form === other.form && member.isEgg === other.isEgg && (member.nickname ?? null) === (other.nickname ?? null) &&
      member.moveIds.every((move, moveIndex) => move === other.moveIds[moveIndex])
  })
}
