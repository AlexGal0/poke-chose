import type { CollectionState, Pokemon } from '../models/pokemon.ts'
import type { CollectionPokemon, PartyPokemon, SaveSnapshot, SavedBoxPokemon, SavedPartyMember } from '../models/party.ts'
import { boxesEqual, isSaveSnapshot, partiesEqual } from '../models/party.ts'
import { getSavePokemon } from '../api/pokeapi.ts'
import { saveDataSource } from './save.ts'
import type { PokemonDataSource } from './data-source.ts'
import { deserializePokedex } from '../models/pokedex.ts'
import type { PokedexState } from '../models/pokedex.ts'
import type { Notice } from '../i18n/notice.ts'
import { bridgeSnapshotMessageKey } from '../i18n/bridge-messages.ts'

export interface TeamSourceState {
  team: PartyPokemon[]
  collection: CollectionPokemon[] | null
  collectionLoading: boolean
  collectionError: boolean
  pokedex: PokedexState | null
  connected: boolean
  message: Notice
  updatedAt: string | null
  error: boolean
}

export function manualTeam(state: CollectionState): Pokemon[] {
  return state.teamIds.flatMap(id => state.collection.filter(pokemon => pokemon.id === id))
}

export const initialSaveTeam: TeamSourceState = {
  team: [], collection: null, collectionLoading: false, collectionError: false, pokedex: null, connected: false, message: { key: 'sources.connectingBridge' }, updatedAt: null, error: false,
}

// Adapts raw party identities to the same static Pokémon model consumed by the UI/domain.
export async function resolveParty(party: SavedPartyMember[], signal: AbortSignal): Promise<PartyPokemon[]> {
  const requests = new Map<string, Promise<Pokemon>>()
  return Promise.all(party.map(async member => {
    const key = `${member.speciesId}-${member.form}`
    if (!requests.has(key)) requests.set(key, getSavePokemon(member.speciesId, member.form, signal))
    const pokemon = await requests.get(key)!
    return { ...pokemon, ...member, instanceKey: `save-${member.slot}-${member.personality}-${member.trainerId}` }
  }))
}

export async function resolveCollection(party: SavedPartyMember[], boxes: SavedBoxPokemon[], signal: AbortSignal): Promise<CollectionPokemon[]> {
  const entries = [
    ...party.map(member => ({ ...member, location: 'party' as const, box: null })),
    ...boxes.map(member => ({ ...member, location: 'box' as const, level: null })),
  ]
  const requests = new Map<string, Promise<Pokemon>>()
  const result: CollectionPokemon[] = new Array(entries.length)
  let next = 0
  // Limit concurrency for large PC collections; cache and share repeated species/forms.
  const worker = async () => {
    while (next < entries.length) {
      signal.throwIfAborted()
      const index = next++
      const member = entries[index]
      const key = `${member.speciesId}-${member.form}`
      if (!requests.has(key)) requests.set(key, getSavePokemon(member.speciesId, member.form, signal))
      const pokemon = await requests.get(key)!
      result[index] = { ...pokemon, ...member, instanceKey: `collection-${member.location}-${member.box ?? 'party'}-${member.slot}-${member.personality}-${member.trainerId}` }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, worker))
  return result
}

export function subscribeSaveTeam(notify: (state: TeamSourceState) => void, previous = initialSaveTeam): () => void {
  return subscribeTeamSource(saveDataSource, notify, previous)
}

export function subscribeTeamSource(source: PokemonDataSource, notify: (state: TeamSourceState) => void, previous = initialSaveTeam): () => void {
  let state = previous
  let target: SavedPartyMember[] | null = null
  let controller = new AbortController()
  let collectionController = new AbortController()
  let collectionTarget: { party: SavedPartyMember[]; boxes: SavedBoxPokemon[] } | null = null
  let collectionRetry: ReturnType<typeof setTimeout> | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let closed = false
  let snapshot: SaveSnapshot | null = null
  let snapshotError = false
  const publish = (patch: Partial<TeamSourceState>) => { state = { ...state, ...patch }; if (!closed) notify(state) }
  const unsubscribe = source.subscribe(event => {
    if (closed) return
    if (event.type === 'connection') {
      snapshotError = !event.connected
      publish({ connected: event.connected, error: !event.connected, message: event.message })
      return
    }
    let next: SaveSnapshot
    try {
      const data: unknown = event.snapshot
      if (!isSaveSnapshot(data)) throw new Error('Invalid snapshot')
      next = data
    } catch { publish({ error: true, message: { key: source.id === 'live' ? 'sources.invalidResponseLive' : 'sources.invalidResponseSave' } }); return }
    snapshot = next
    snapshotError = next.status === 'error' || next.status === 'missing' || next.backup || event.connected === false
    publish({ connected: event.connected ?? true, message: { key: bridgeSnapshotMessageKey(source.id, next.message) }, error: snapshotError,
      ...(next.pokedex !== null ? { pokedex: deserializePokedex(next.pokedex), updatedAt: next.updatedAt } : {}) })
    if (next.party !== null && next.boxes !== null &&
      (!collectionTarget || !partiesEqual(collectionTarget.party, next.party) || !boxesEqual(collectionTarget.boxes, next.boxes))) {
      collectionTarget = { party: next.party, boxes: next.boxes }
      collectionController.abort()
      collectionController = new AbortController()
      clearTimeout(collectionRetry)
      const collectionSignal = collectionController.signal
      const imported = collectionTarget
      const hydrateCollection = async () => {
        try {
          const collection = await resolveCollection(imported.party, imported.boxes, collectionSignal)
          if (closed || collectionSignal.aborted) return
          publish({ collection, collectionLoading: false, collectionError: false })
        } catch {
          if (closed || collectionSignal.aborted) return
          publish({ collectionLoading: false, collectionError: true })
          collectionRetry = setTimeout(() => { publish({ collectionLoading: true }); void hydrateCollection() }, 5000)
        }
      }
      publish({ collectionLoading: true, collectionError: false })
      void hydrateCollection()
    }
    if (next.party === null || partiesEqual(target, next.party)) return
    target = next.party
    controller.abort()
    controller = new AbortController()
    clearTimeout(retry)
    const signal = controller.signal
    const party = next.party
    const hydrate = async () => {
      try {
        const team = await resolveParty(party, signal)
        if (closed || signal.aborted) return
          publish({ team, updatedAt: snapshot?.updatedAt ?? next.updatedAt, ...(snapshotError ? {} : { message: { key: bridgeSnapshotMessageKey(source.id, snapshot?.message ?? next.message) } }), error: snapshotError })
      } catch {
        if (closed || signal.aborted) return
        publish({ error: true, message: { key: 'sources.partyResolveFailed' } })
        retry = setTimeout(() => { void hydrate() }, 5000)
      }
    }
    publish({ message: { key: 'sources.loadingSpeciesData' } })
    void hydrate()
  })
  return () => { closed = true; controller.abort(); collectionController.abort(); clearTimeout(retry); clearTimeout(collectionRetry); unsubscribe() }
}
