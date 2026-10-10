import type { ReaderStatus } from '../domain/reader-status.ts'

export function readerStatusLabel(t: (key: string) => string, status: ReaderStatus): string {
  return t(`readerConnections.status.${status}`)
}
