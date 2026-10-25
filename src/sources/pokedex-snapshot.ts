import type { PokedexSnapshot } from '../models/pokedex.ts'
import type { SavedPartyMember, SavedBoxPokemon } from '../models/party.ts'
import { isSavedParty, isSavedBoxes } from './saved-pokemon-validation.ts'
import type { SavedPokemonLimits } from './saved-pokemon-validation.ts'
import { isDaycareData } from '../games/core/daycare.ts'
import type { DaycareData } from '../games/core/daycare.ts'

export const POKEDEX_MESSAGES = ['waiting', 'unconfigured', 'ready', 'missing', 'readError', 'connectionLost'] as const
export interface PokedexBridgeSnapshot {
  protocol: 1
  sourceId: string
  status: 'waiting' | 'ready' | 'missing' | 'error'
  message: typeof POKEDEX_MESSAGES[number]
  pokedex: PokedexSnapshot | null
  updatedAt: string | null
  party?: SavedPartyMember[]
  boxes?: SavedBoxPokemon[]
  capabilities?: { daycare?: true }
  daycare?: DaycareData | null
  daycareStale?: boolean
}
export const emptyPokedexSnapshot = (sourceId: string): PokedexBridgeSnapshot => ({ protocol: 1, sourceId, status: 'waiting', message: 'waiting', pokedex: null, updatedAt: null })
export function isPokedexBridgeSnapshot(value: unknown, sourceId: string, maxSpecies: number, pokemonLimits?: SavedPokemonLimits): value is PokedexBridgeSnapshot {
  if (!value || typeof value !== 'object') return false
  const data = value as PokedexBridgeSnapshot
  if (data.capabilities?.daycare !== undefined && data.capabilities.daycare !== true) return false
  if (data.daycareStale !== undefined && typeof data.daycareStale !== 'boolean') return false
  if (data.daycareStale === false && data.daycare == null) return false
  if (data.daycare != null && (data.capabilities?.daycare !== true || !pokemonLimits || !isDaycareData(data.daycare, maxSpecies, pokemonLimits.nicknameLength))) return false
  if (data.party !== undefined || data.boxes !== undefined) {
    if (!pokemonLimits || !isSavedParty(data.party, pokemonLimits) || !isSavedBoxes(data.boxes, pokemonLimits) || data.pokedex == null || data.updatedAt == null) return false
  }
  if (data.protocol !== 1 || data.sourceId !== sourceId || !['waiting', 'ready', 'missing', 'error'].includes(data.status) || !POKEDEX_MESSAGES.includes(data.message)) return false
  const messages = { waiting: ['waiting', 'unconfigured'], ready: ['ready'], missing: ['missing'], error: ['readError', 'connectionLost'] }
  if (!messages[data.status].includes(data.message)) return false
  if (data.updatedAt !== null && (typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)))) return false
  if (data.pokedex !== null) {
    if (typeof data.pokedex !== 'object') return false
    if (![data.pokedex.seenSpeciesIds, data.pokedex.caughtSpeciesIds].every(ids => Array.isArray(ids) && ids.length <= maxSpecies && new Set(ids).size === ids.length && ids.every(id => Number.isInteger(id) && id >= 1 && id <= maxSpecies))) return false
    if (data.updatedAt === null) return false
  } else if (data.updatedAt !== null) return false
  return data.status !== 'ready' || (data.pokedex !== null && data.message === 'ready')
}
