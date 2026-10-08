export type ReaderStatus = 'connected' | 'connecting' | 'waiting' | 'disconnected' | 'paused'

export function readerStatus({ connected, connecting, error, paused = false }: {
  connected: boolean; connecting: boolean; error: boolean; paused?: boolean
}): ReaderStatus {
  if (connecting) return 'connecting'
  if (paused) return 'paused'
  if (connected) return 'connected'
  return error ? 'disconnected' : 'waiting'
}
