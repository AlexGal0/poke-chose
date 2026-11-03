import type { DataSourceEvent } from '../../sources/data-source.ts'
import { isSaveSnapshot } from '../../models/party.ts'
import type { SavedPartyMember, SavedBoxPokemon, DaycareState } from '../../models/party.ts'
import type { PokedexState } from '../../models/pokedex.ts'
import { deserializePokedex } from '../../models/pokedex.ts'
import type { PlayerPosition } from '../../models/player-position.ts'
import type { RepelReading } from '../../models/repel.ts'
import { isRepelReading } from '../../models/repel.ts'
import type { Notice } from '../../i18n/notice.ts'
import { bridgeSnapshotMessageKey } from '../../i18n/bridge-messages.ts'

export interface BlackSourceState {
  partyStale: boolean
  pokedexStale: boolean
  party: SavedPartyMember[] | null
  boxes: SavedBoxPokemon[] | null
  pokedex: PokedexState | null
  daycare: DaycareState | null
  daycareStale: boolean
  position: PlayerPosition | null
  positionStale: boolean
  repel: RepelReading | null
  repelStale: boolean
  connected: boolean
  error: boolean
  collectionError: boolean
  updatedAt: string | null
  message: Notice
}
export const emptyBlackSource: BlackSourceState = {
  partyStale: true, pokedexStale: true, party: null, boxes: null, pokedex: null, daycare: null, daycareStale: true,
  position: null, positionStale: true, repel: null, repelStale: true,
  connected: false, error: false, collectionError: false, updatedAt: null, message: { key: 'sources.connectingBridge' },
}
export function advanceBlackSource(previous: BlackSourceState, event: DataSourceEvent, sourceId: string, repelSupported: boolean): BlackSourceState {
  if (event.type === 'repel') {
    if (!repelSupported) return previous
    const valid = previous.connected && !previous.error && !previous.partyStale && isRepelReading(event.reading)
    return { ...previous, repel: valid ? event.reading as RepelReading : previous.repel, repelStale: !valid }
  }
  if (event.type === 'connection') return { ...previous, connected: event.connected, error: !event.connected, message: event.message,
    ...(!event.connected ? { partyStale: true, pokedexStale: true, daycareStale: true, positionStale: true, repelStale: true } : {}) }
  const snapshot = event.snapshot
  if (!isSaveSnapshot(snapshot)) return { ...previous, error: true, partyStale: true, pokedexStale: true, daycareStale: true, positionStale: true, repelStale: true,
    message: { key: sourceId === 'live' ? 'sources.invalidResponseLive' : 'sources.invalidResponseSave' } }
  const readable = snapshot.status === 'ready'
  const fresh = readable && !snapshot.backup && event.connected !== false
  return {
    ...previous, connected: event.connected ?? snapshot.status === 'ready', error: snapshot.status === 'error' || snapshot.status === 'missing' || snapshot.backup || event.connected === false,
    message: { key: bridgeSnapshotMessageKey(sourceId, snapshot.message) },
    ...(readable ? { party: snapshot.party ?? previous.party, boxes: snapshot.boxes ?? previous.boxes,
      pokedex: snapshot.pokedex ? deserializePokedex(snapshot.pokedex) : previous.pokedex,
      updatedAt: snapshot.updatedAt ?? previous.updatedAt, collectionError: snapshot.boxes === null } : {}),
    partyStale: !fresh || snapshot.party === null,
    pokedexStale: !fresh || snapshot.pokedex === null,
    daycare: readable && snapshot.daycare ? snapshot.daycare : previous.daycare,
    daycareStale: !fresh || snapshot.daycare == null,
    position: readable ? snapshot.position ?? null : previous.position,
    positionStale: !fresh || snapshot.position == null,
    repel: readable && repelSupported && snapshot.repel ? snapshot.repel : previous.repel,
    repelStale: !fresh || !repelSupported || snapshot.repel == null,
  }
}
