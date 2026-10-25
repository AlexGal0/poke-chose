import type { ConnectionStatus } from '../models/connection-status.ts'

export function connectionStatusColor(data: ConnectionStatus): 'manual' | 'connected' | 'partial' | 'waiting' | 'disconnected' {
  if (data.manual) return 'manual'
  const statuses = data.readers.filter(reader => reader.affectsSummary !== false).map(reader => reader.status)
  if (statuses.length && statuses.every(status => status === 'connected')) return 'connected'
  if (statuses.some(status => status === 'connected')) return 'partial'
  if (statuses.some(status => status === 'connecting')) return 'waiting'
  if (statuses.some(status => status === 'disconnected' || status === 'paused')) return 'disconnected'
  return 'waiting'
}
