import type { InventoryReading } from '../../src/games/core/inventory.ts'
import type { PokedexSnapshot } from '../../src/models/pokedex.ts'
import type { SavedPartyMember, SavedBoxPokemon } from '../../src/models/party.ts'
import { emptyLivePartySnapshot } from '../../src/sources/live-party-snapshot.ts'
import type { LivePartySnapshot } from '../../src/sources/live-party-snapshot.ts'
import type { BattleReading } from '../../src/models/battle.ts'
import type { PlayerPosition } from '../../src/models/player-position.ts'
import { createXSessionReader, XProfileMismatch } from './x-session.ts'
import type { DaycareData } from '../../src/games/core/daycare.ts'

export interface PartyReader { read(includeBoxes?: boolean): Promise<{ inventory?: InventoryReading; party: SavedPartyMember[]; pokedex: PokedexSnapshot; boxes?: SavedBoxPokemon[]; battle?: BattleReading | null; position?: PlayerPosition | null; daycare?: DaycareData | null }>; close(): void }
export class LivePartyController {
  snapshot: LivePartySnapshot
  private nextBoxesAt = 0
  private readonly boxesPollMs: number
  private timer: ReturnType<typeof setTimeout> | undefined
  private generation = 0
  private reader: PartyReader | null = null
  private readonly notify: (snapshot: LivePartySnapshot) => void
  private readonly factory: () => PartyReader
  private readonly pollMs: number
  constructor(notify: (snapshot: LivePartySnapshot) => void, factory: () => PartyReader = createXSessionReader, pollMs = 2000, boxesPollMs = 120000, sourceId: 'x-live' | 'y-live' = 'x-live') {
    this.snapshot = emptyLivePartySnapshot(sourceId)
    if (!Number.isInteger(boxesPollMs) || boxesPollMs < 10 || boxesPollMs > 600000) throw new Error('Invalid boxes interval')
    this.boxesPollMs = boxesPollMs
    if (!Number.isInteger(pollMs) || pollMs < 10 || pollMs > 60000) throw new Error('Invalid live poll interval')
    this.notify = notify
    this.factory = factory
    this.pollMs = pollMs
  }
  private publish(update: Partial<LivePartySnapshot>) {
    this.snapshot = { ...this.snapshot, ...update }
    this.notify(this.snapshot)
  }
  connect() {
    if (this.snapshot.enabled) return
    this.nextBoxesAt = 0
    const generation = ++this.generation
    this.publish({ enabled: true, status: 'waiting', message: 'connecting', inventoryStale: true, daycareStale: true })
    void this.poll(generation)
  }
  refresh() {
    if (!this.snapshot.enabled || this.snapshot.boxesStatus === 'reading') return
    this.nextBoxesAt = 0
    if (!this.reader) {
      clearTimeout(this.timer)
      void this.poll(this.generation)
    }
  }
  disconnect() {
    ++this.generation
    clearTimeout(this.timer)
    this.reader?.close()
    this.reader = null
    this.publish({ enabled: false, status: 'waiting', message: 'disconnected', inventoryStale: true, daycareStale: true, boxesStatus: this.snapshot.boxes ? 'error' : 'waiting' })
  }
  private async poll(generation: number) {
    let reader: PartyReader | null = null
    const includeBoxes = Date.now() >= this.nextBoxesAt
    if (includeBoxes) this.publish({ boxesStatus: 'reading' })
    try {
      reader = this.factory()
      this.reader = reader
      const { party, pokedex, boxes, battle, position, daycare, inventory } = await reader.read(includeBoxes)
      if (generation !== this.generation) return
      const now = new Date().toISOString()
      const boxUpdate: Partial<LivePartySnapshot> = includeBoxes ? boxes ? { boxes, boxesStatus: 'ready', boxesUpdatedAt: now } : { boxesStatus: 'error' } : {}
      if (includeBoxes) this.nextBoxesAt = Date.now() + (boxes ? this.boxesPollMs : Math.min(15000, this.boxesPollMs))
      const heldIdentity = (members: SavedPartyMember[] | null) => JSON.stringify(members?.map(p => [p.personality, p.trainerId, p.heldItemId, p.isEgg]))
      const inventoryUpdate = includeBoxes
        ? { inventory: inventory ?? this.snapshot.inventory ?? null, inventoryStale: inventory == null }
        : { inventoryStale: this.snapshot.inventoryStale || heldIdentity(party) !== heldIdentity(this.snapshot.party) }
      this.publish({ ...boxUpdate, ...inventoryUpdate, daycare: daycare ?? this.snapshot.daycare ?? null, daycareStale: daycare == null, position: position ?? null, battle: battle ?? null, status: 'ready', message: 'ready', party, pokedex, updatedAt: now })
    } catch (error) {
      if (generation !== this.generation) return
      this.publish({ inventoryStale: true, daycareStale: true, boxesStatus: this.snapshot.boxes ? 'error' : 'waiting', status: 'error', message: error instanceof XProfileMismatch ? 'profileMismatch' : 'readError' })
    } finally {
      reader?.close()
      if (this.reader === reader) this.reader = null
      if (generation === this.generation && this.snapshot.enabled) this.timer = setTimeout(() => { void this.poll(generation) }, this.pollMs)
    }
  }
}
