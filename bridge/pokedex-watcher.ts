import { watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { basename, dirname } from 'node:path'
import type { SavePokedexReader } from '../src/games/core/save-pokedex.ts'
import { serializePokedex } from '../src/models/pokedex.ts'
import { emptyPokedexSnapshot } from '../src/sources/pokedex-snapshot.ts'
import type { PokedexBridgeSnapshot } from '../src/sources/pokedex-snapshot.ts'
import { readStableFile } from './stable-file.ts'
import type { DaycareData } from '../src/games/core/daycare.ts'

export interface PokedexWatchOptions { debounceMs?: number; recoveryMs?: number; retryMs?: number[]; read?: (path: string, size: number) => Promise<Buffer> }
export class PokedexWatcher {
  snapshot: PokedexBridgeSnapshot
  private watcher: FSWatcher | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private stopped = false
  private generation = 0
  private busy = false
  private attempt = 0
  private readonly path: string
  private readonly reader: SavePokedexReader
  private readonly notify: (snapshot: PokedexBridgeSnapshot) => void
  private readonly options: Required<PokedexWatchOptions>
  constructor(path: string, sourceId: string, reader: SavePokedexReader, notify: (snapshot: PokedexBridgeSnapshot) => void, options: PokedexWatchOptions = {}) {
    this.path = path
    this.reader = reader
    this.notify = notify
    this.snapshot = emptyPokedexSnapshot(sourceId)
    if (reader.parseDaycare) Object.assign(this.snapshot, { capabilities: { daycare: true }, daycare: null, daycareStale: true })
    this.options = { debounceMs: 300, recoveryMs: 5000, retryMs: [500, 1000, 2000], read: readStableFile, ...options }
  }
  start() { this.attach(); this.schedule(0); return this }
  private attach() {
    if (this.watcher || this.stopped) return
    try {
      this.watcher = watch(dirname(this.path), (_, name) => {
        if (name === null || name.toString().toLowerCase() === basename(this.path).toLowerCase()) { this.attempt = 0; this.schedule(this.options.debounceMs) }
      })
      this.watcher.on('error', () => { this.watcher?.close(); this.watcher = null; this.schedule(this.options.recoveryMs) })
    } catch { /* Recovery also handles a directory created later. */ }
  }
  private schedule(ms: number) {
    if (this.stopped) return
    this.generation++
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { void this.read() }, ms)
  }
  private publish(snapshot: PokedexBridgeSnapshot) {
    if (JSON.stringify(snapshot) === JSON.stringify(this.snapshot)) return
    this.snapshot = snapshot
    this.notify(snapshot)
  }
  private async read() {
    if (this.stopped) return
    if (this.busy) { this.timer = setTimeout(() => { void this.read() }, this.options.debounceMs); return }
    this.busy = true
    const generation = this.generation
    this.attach()
    try {
      const bytes = await this.options.read(this.path, this.reader.byteLength)
      const pokedex = serializePokedex(this.reader.parse(bytes))
      const pokemon = this.reader.parsePokemon?.(bytes)
      let daycare: DaycareData | null = null
      if (this.reader.parseDaycare) {
        try { daycare = this.reader.parseDaycare(bytes) }
        catch { /* A corrupt optional block must not invalidate the core save. */ }
      }
      if (this.stopped || generation !== this.generation) return
      this.attempt = 0
      const changed = JSON.stringify([pokedex, pokemon, daycare ?? this.snapshot.daycare ?? null]) !== JSON.stringify([this.snapshot.pokedex, this.snapshot.party === undefined ? undefined : { party: this.snapshot.party, boxes: this.snapshot.boxes }, this.snapshot.daycare ?? null])
      this.publish({ ...this.snapshot, ...pokemon, ...(this.reader.parseDaycare ? { daycare: daycare ?? this.snapshot.daycare, daycareStale: daycare === null } : {}), status: 'ready', message: 'ready', pokedex, updatedAt: changed ? new Date().toISOString() : this.snapshot.updatedAt })
    } catch (error) {
      if (this.stopped || generation !== this.generation) return
      if (this.attempt < this.options.retryMs.length) { this.schedule(this.options.retryMs[this.attempt++]); return }
      const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
      this.publish({ ...this.snapshot, ...(this.reader.parseDaycare ? { daycareStale: true } : {}), status: missing ? 'missing' : 'error', message: missing ? 'missing' : 'readError' })
    } finally {
      this.busy = false
      // Periodic reconciliation recovers missed filesystem events as well.
      if (!this.stopped && generation === this.generation) this.schedule(this.options.recoveryMs)
    }
  }
  stop() { this.stopped = true; this.generation++; clearTimeout(this.timer); this.watcher?.close(); this.watcher = null }
}
