import type { PokedexSnapshot } from '../models/pokedex.ts'
import type { SavedPartyMember, SavedBoxPokemon } from '../models/party.ts'
import { isSavedParty, isSavedBoxes } from './saved-pokemon-validation.ts'
import { isBattleReading } from '../models/battle.ts'
import type { BattleReading } from '../models/battle.ts'
import { isPlayerPosition } from '../models/player-position.ts'
import type { PlayerPosition } from '../models/player-position.ts'
import { isDaycareData } from '../games/core/daycare.ts'
import type { DaycareData } from '../games/core/daycare.ts'

export const LIVE_PARTY_MESSAGES = ['pressConnect', 'connecting', 'ready', 'readError', 'profileMismatch', 'disconnected', 'connectionLost'] as const
export interface LivePartySnapshot {
  protocol: 3
  daycare?: DaycareData | null
  daycareStale?: boolean
  battle?: BattleReading | null
  position?: PlayerPosition | null
  sourceId: 'x-live'
  enabled: boolean
  status: 'waiting' | 'ready' | 'error'
  message: typeof LIVE_PARTY_MESSAGES[number]
  capabilities: { party: true; boxes: true; pokedex: true; battle?: true; location?: true; daycare?: true }
  boxes: SavedBoxPokemon[] | null
  boxesStatus: 'waiting' | 'reading' | 'ready' | 'error'
  boxesUpdatedAt: string | null
  party: SavedPartyMember[] | null
  pokedex: PokedexSnapshot | null
  updatedAt: string | null
}
export const emptyLivePartySnapshot = (): LivePartySnapshot => ({ protocol: 3, sourceId: 'x-live', enabled: false, status: 'waiting', message: 'pressConnect', capabilities: { party: true, boxes: true, pokedex: true, battle: true, location: true, daycare: true }, daycare: null, daycareStale: true, position: null, boxes: null, boxesStatus: 'waiting', boxesUpdatedAt: null, party: null, pokedex: null, updatedAt: null })
export function isLivePartySnapshot(value: unknown): value is LivePartySnapshot {
  if (!value || typeof value !== 'object') return false
  const s = value as LivePartySnapshot
  if (s.capabilities?.daycare !== undefined && s.capabilities.daycare !== true) return false
  if (s.daycareStale !== undefined && typeof s.daycareStale !== 'boolean') return false
  if (s.daycareStale === false && s.daycare == null) return false
  if (s.daycare != null && (s.capabilities?.daycare !== true || !isDaycareData(s.daycare, 721, 12))) return false
  if (s.capabilities?.location !== undefined && s.capabilities.location !== true) return false
  if (s.position != null && (s.capabilities?.location !== true || !isPlayerPosition(s.position) || s.position.mapId > 0xffff)) return false
  if (s.capabilities?.battle !== undefined && s.capabilities.battle !== true) return false
  if (s.battle != null && !isBattleReading(s.battle, 721)) return false
  if (s.protocol !== 3 || s.sourceId !== 'x-live' || typeof s.enabled !== 'boolean' || !LIVE_PARTY_MESSAGES.includes(s.message) || s.capabilities?.party !== true || s.capabilities.boxes !== true || s.capabilities.pokedex !== true) return false
  if (!['waiting', 'reading', 'ready', 'error'].includes(s.boxesStatus)) return false
  if (s.boxes !== null && !isSavedBoxes(s.boxes, { maxSpecies: 721, boxCount: 31, nicknameLength: 12 })) return false
  if (s.boxes === null ? s.boxesUpdatedAt !== null : typeof s.boxesUpdatedAt !== 'string' || !Number.isFinite(Date.parse(s.boxesUpdatedAt))) return false
  if (s.boxesStatus === 'ready' && s.boxes === null) return false
  if (s.pokedex !== null && (!s.pokedex || ![s.pokedex.seenSpeciesIds, s.pokedex.caughtSpeciesIds].every(ids => Array.isArray(ids) && ids.length <= 721 && new Set(ids).size === ids.length && ids.every(id => Number.isInteger(id) && id >= 1 && id <= 721)))) return false
  if ((s.party === null) !== (s.pokedex === null)) return false
  if (s.party !== null && (!isSavedParty(s.party, { maxSpecies: 721, boxCount: 31, nicknameLength: 12 }) || s.party.length === 0)) return false
  if (s.party === null ? s.updatedAt !== null : typeof s.updatedAt !== 'string' || !Number.isFinite(Date.parse(s.updatedAt))) return false
  if (s.status === 'ready') return s.enabled && s.message === 'ready' && s.party !== null
  if (s.status === 'error') return ['readError', 'profileMismatch', 'connectionLost'].includes(s.message)
  return s.status === 'waiting' && (s.enabled ? s.message === 'connecting' : ['pressConnect', 'disconnected'].includes(s.message))
}
