import type { SavedPokemonData, SavedPartyMember, SavedBoxPokemon } from '../models/party.ts'
import { isCurrentStats } from '../domain/stats.ts'

export interface SavedPokemonLimits { maxSpecies: number; boxCount: number; nicknameLength: number }
const integer = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
export function isSavedPokemon(value: unknown, limits: SavedPokemonLimits): value is SavedPokemonData {
  if (!value || typeof value !== 'object') return false
  const p = value as SavedPokemonData
  return integer(p.speciesId, 1, limits.maxSpecies) && integer(p.personality, 0, 0xffffffff) && integer(p.trainerId, 0, 0xffffffff) &&
    (p.hatchCyclesRemaining === undefined || p.isEgg && integer(p.hatchCyclesRemaining, 0, 255)) &&
    integer(p.heldItemId, 0, 65535) && integer(p.abilityId, 0, 65535) && integer(p.form, 0, 31) && typeof p.isEgg === 'boolean' &&
    (p.natureId === undefined || integer(p.natureId, 0, 24)) && (p.experience === undefined || integer(p.experience, 0, 0xffffffff)) &&
    (p.gender === undefined || ['male', 'female', 'genderless'].includes(p.gender)) &&
    (p.nickname == null || (typeof p.nickname === 'string' && p.nickname.length <= limits.nicknameLength && p.nickname.trim().length > 0 && [...p.nickname].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127))) &&
    Array.isArray(p.moveIds) && p.moveIds.length === 4 && p.moveIds.every(id => integer(id, 0, 65535))
}
export function isSavedParty(value: unknown, limits: SavedPokemonLimits): value is SavedPartyMember[] {
  return Array.isArray(value) && value.length <= 6 && value.every((member, slot) => {
    if (!isSavedPokemon(member, limits)) return false
    const p = member as SavedPartyMember
    return p.slot === slot && integer(p.level, 1, 100) &&
    (p.currentHp === undefined && p.maxHp === undefined || integer(p.currentHp, 0, 65535) && integer(p.maxHp, 0, 65535) && p.currentHp! <= p.maxHp!) &&
    (p.currentStats === undefined || isCurrentStats(p.currentStats) && p.currentStats.hp === p.maxHp)
  })
}
export function isSavedBoxes(value: unknown, limits: SavedPokemonLimits): value is SavedBoxPokemon[] {
  return Array.isArray(value) && value.length <= limits.boxCount * 30 && new Set(value.map(p => `${p?.box}:${p?.slot}`)).size === value.length &&
    value.every(member => {
      if (!isSavedPokemon(member, limits)) return false
      const p = member as SavedBoxPokemon
      return integer(p.box, 0, limits.boxCount - 1) && integer(p.slot, 0, 29)
    })
}
