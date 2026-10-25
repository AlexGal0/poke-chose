import type { ReaderStatus } from '../domain/reader-status.ts'

export interface ConnectionReaderStatus {
  id: string
  label: string
  status: ReaderStatus
  message?: string
  updatedAt?: string | null
  // Informational/cached readings can be displayed without affecting the summary.
  affectsSummary?: boolean
}

// Composition supplies only the readers actually supported by the selected source.
// Display text is localized before reaching the shared indicator.
export interface ConnectionStatus {
  manual: boolean
  readers: readonly ConnectionReaderStatus[]
  message?: string
}
