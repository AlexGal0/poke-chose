import { liveDataSource } from './live.ts'
import { KeyedError } from '../i18n/notice.ts'

export type ReaderId = 'general' | 'battle'
export type ReaderResult = { reader: ReaderId; error: unknown | null }

export async function connectReaders(onResult: (result: ReaderResult) => void = () => {}): Promise<ReaderResult[]> {
  const operations: [ReaderId, () => Promise<void>][] = [
    ['general', async () => { await liveDataSource.reconnect!() }],
    ['battle', async () => {
      const response = await fetch('/enemy-api/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new KeyedError('enemyPrototype.errors.reconnectFailed')
    }],
  ]
  return Promise.all(operations.map(async ([reader, operation]) => {
    let result: ReaderResult
    try { await operation(); result = { reader, error: null } }
    catch (error) { result = { reader, error } }
    onResult(result)
    return result
  }))
}
