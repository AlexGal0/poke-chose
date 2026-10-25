import type { ConnectionStatus, ConnectionReaderStatus } from '../../models/connection-status.ts'
import type { PokedexBridgeSnapshot } from '../../sources/pokedex-snapshot.ts'
import type { LivePartySnapshot } from '../../sources/live-party-snapshot.ts'

export function xConnectionStatus(source: 'manual' | 'save' | 'live', save: PokedexBridgeSnapshot, live: LivePartySnapshot, input: {
  manualHint: string; saveLabel: string; liveLabel: string; boxesLabel: string
  saveMessage: string; liveMessage: string; boxesMessage: string; controlError?: boolean
}): ConnectionStatus {
  if (source === 'manual') return { manual: true, readers: [], message: input.manualHint }
  if (source === 'save') return { manual: false, readers: [{ id: 'save', label: input.saveLabel,
    status: save.status === 'ready' ? 'connected' : save.status === 'waiting' ? 'waiting' : 'disconnected',
    message: input.saveMessage, updatedAt: save.updatedAt }] }
  const status = live.status === 'ready' ? 'connected' : live.message === 'connecting' ? 'connecting'
    : live.status === 'error' || live.message === 'disconnected' || input.controlError ? 'disconnected' : 'waiting'
  const readers: ConnectionReaderStatus[] = [{ id: 'live', label: input.liveLabel, status, message: input.liveMessage, updatedAt: live.updatedAt }]
  // Battle, party and Pokédex share the live connection; do not invent an independent battle reader.
  if (live.capabilities.boxes) readers.push({ id: 'boxes', label: input.boxesLabel, affectsSummary: false,
    status: status !== 'connected' ? status : live.boxesStatus === 'ready' ? 'connected' : live.boxesStatus === 'reading' ? 'connecting' : live.boxesStatus === 'error' ? 'disconnected' : 'waiting',
    message: input.boxesMessage, updatedAt: live.boxesUpdatedAt })
  return { manual: false, readers }
}
