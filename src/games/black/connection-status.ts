import type { ConnectionStatus } from '../../models/connection-status.ts'
import type { TeamSourceState } from '../../sources/team.ts'
import type { ReaderStatus } from '../../domain/reader-status.ts'

export function blackConnectionStatus(source: 'manual' | 'save' | 'live', state: TeamSourceState, input: {
  generalStatus: ReaderStatus; battleStatus: ReaderStatus; generalMessage: string; battleMessage: string
  generalLabel: string; battleLabel: string; saveLabel: string; saveMessage: string; manualHint: string
}): ConnectionStatus {
  if (source === 'manual') return { manual: true, readers: [], message: input.manualHint }
  if (source === 'save') return { manual: false, readers: [{ id: 'save', label: input.saveLabel,
    status: state.connected && !state.error ? 'connected' : state.error || state.updatedAt ? 'disconnected' : 'waiting',
    message: input.saveMessage, updatedAt: state.updatedAt }] }
  return { manual: false, readers: [
    { id: 'general', label: input.generalLabel, status: input.generalStatus, message: input.generalMessage, updatedAt: state.updatedAt },
    { id: 'battle', label: input.battleLabel, status: input.battleStatus, message: input.battleMessage },
  ] }
}
