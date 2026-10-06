// Same normalized data contract for files, emulator memory or other providers.
// null means unavailable; [] means read successfully and empty.
export type { PokemonSnapshot } from '../models/party.ts'
import type { Notice } from '../i18n/notice.ts'

export type DataSourceEvent =
  | { type: 'connection'; connected: boolean; message: Notice }
  | { type: 'snapshot'; snapshot: unknown; connected?: boolean }

export interface PokemonDataSource {
  readonly id: string
  // Translation key for this source's display name (e.g. "sources.save.label"), not literal text.
  readonly labelKey: string
  readonly capabilities: {
    party: boolean
    boxes: boolean
    pokedex: boolean
  }
  subscribe(notify: (event: DataSourceEvent) => void): () => void
  // Optional explicit reconnection, for providers such as the live reader.
  reconnect?: () => void | Promise<void>
}
