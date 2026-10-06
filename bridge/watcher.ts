import { watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { basename, dirname } from 'node:path'
import { readStableSave } from './read-save.ts'
import { parseSave } from './parser.ts'
import { boxesEqual, partiesEqual } from '../src/models/party.ts'
import type { SaveSnapshot } from '../src/models/party.ts'
import { pokedexEqual, serializePokedex } from '../src/models/pokedex.ts'

interface WatchOptions {
  debounceMs?: number
  retryMs?: number[]
  recoveryMs?: number
  read?: typeof readStableSave
  log?: (message: string) => void
}

export class SaveWatcher {
  snapshot: SaveSnapshot = { status: 'waiting', message: 'Esperando el save…', party: null, boxes: null, pokedex: null, updatedAt: null, backup: false }
  private fileWatcher: FSWatcher | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private generation = 0
  private reading = false
  private stopped = false
  private attempt = 0
  private readonly options: Required<WatchOptions>
  private readonly path: string
  private readonly notify: (snapshot: SaveSnapshot) => void

  constructor(path: string, notify: (snapshot: SaveSnapshot) => void, options: WatchOptions = {}) {
    this.path = path
    this.notify = notify
    this.options = { debounceMs: 300, retryMs: [500, 1000, 2000], recoveryMs: 5000, read: readStableSave, log: message => console.log(`[save] ${message}`), ...options }
  }

  start() {
    this.attachWatcher()
    this.schedule(0)
    return this
  }

  private attachWatcher() {
    if (this.fileWatcher || this.stopped) return
    try {
      // Watch the directory, so an atomic replacement does not orphan the watcher.
      this.fileWatcher = watch(dirname(this.path), (_event, filename) => {
        if (filename === null || filename.toString().toLowerCase() === basename(this.path).toLowerCase()) {
          this.attempt = 0
          this.schedule(this.options.debounceMs)
        }
      })
      this.fileWatcher.on('error', () => {
        this.fileWatcher?.close()
        this.fileWatcher = null
        this.schedule(this.options.recoveryMs)
      })
      this.options.log('Watcher de directorio iniciado (solo lectura).')
    } catch {
      this.options.log('Directorio no disponible; se reintentará sin polling intensivo.')
    }
  }

  private schedule(ms: number) {
    if (this.stopped) return
    this.generation++
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { void this.process() }, ms)
  }

  private publish(next: SaveSnapshot) {
    if (JSON.stringify(this.snapshot) === JSON.stringify(next)) return
    this.snapshot = next
    this.notify(next)
  }

  private async process() {
    if (this.stopped) return
    if (this.reading) {
      this.timer = setTimeout(() => { void this.process() }, this.options.debounceMs)
      return
    }
    this.reading = true
    const generation = this.generation
    this.attachWatcher()
    let bytes: Buffer | undefined
    try {
      this.options.log('Cambio agrupado / lectura estable iniciada.')
      bytes = await this.options.read(this.path)
      const result = parseSave(bytes, false)
      if (this.stopped || generation !== this.generation) return
      this.attempt = 0
      this.accept(result)
      // Only needed if OS watcher could not attach.
      if (!this.fileWatcher) this.schedule(this.options.recoveryMs)
    } catch (error) {
      if (this.stopped || generation !== this.generation) return
      if (this.attempt < this.options.retryMs.length) {
        this.schedule(this.options.retryMs[this.attempt++])
        return
      }
      // Backup is an explicit recovery on initial load only, never a rollback of an active team.
      if (bytes && this.snapshot.party === null) {
        try {
          const backup = parseSave(bytes)
          this.accept(backup)
          this.schedule(this.options.recoveryMs)
          return
        } catch { /* Both copies invalid. */ }
      }
      const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT'
      const message = missing ? 'Save no encontrado. Esperando a que aparezca…' : `Error leyendo save: ${error instanceof Error ? error.message : 'error desconocido'}`
      this.options.log(message)
      this.publish({ ...this.snapshot, status: missing ? 'missing' : 'error', message })
      this.schedule(this.options.recoveryMs)
    } finally {
      this.reading = false
    }
  }

  private accept(result: ReturnType<typeof parseSave>) {
    const changed = !partiesEqual(this.snapshot.party, result.party)
    const boxesChanged = !boxesEqual(this.snapshot.boxes, result.boxes)
    const pokedex = serializePokedex(result.pokedex)
    const dexChanged = !pokedexEqual(this.snapshot.pokedex, pokedex)
    if (changed) this.options.log(`Save válido; party encontrado (${result.party.length}); cambio de party detectado.`)
    if (boxesChanged) this.options.log(`Cajas actualizadas: ${result.boxes.length} ejemplares almacenados.`)
    if (dexChanged) this.options.log(`Pokédex actualizada: ${pokedex.caughtSpeciesIds.length} capturados / ${pokedex.seenSpeciesIds.length} vistos.`)
    this.publish({
      status: 'ready', message: result.backup ? 'Copia principal inválida. Mostrando respaldo BW válido; esperando recuperación.' : 'Save actualizado · esperando cambios…',
      party: changed ? result.party : this.snapshot.party,
      boxes: boxesChanged ? result.boxes : this.snapshot.boxes,
      pokedex: dexChanged ? pokedex : this.snapshot.pokedex,
      updatedAt: changed || boxesChanged || dexChanged ? new Date().toISOString() : this.snapshot.updatedAt,
      backup: result.backup,
    })
  }

  stop() {
    this.stopped = true
    this.generation++
    clearTimeout(this.timer)
    this.fileWatcher?.close()
    this.fileWatcher = null
  }
}
