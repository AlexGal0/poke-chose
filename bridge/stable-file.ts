import { open, stat } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

export async function readStableFile(path: string, expectedSize: number, quietMs = 120): Promise<Buffer> {
  async function read() {
    const file = await open(path, 'r')
    try {
      const before = await file.stat()
      if (!before.isFile() || before.size !== expectedSize) throw new Error('Invalid save size')
      const bytes = await file.readFile()
      const after = await file.stat()
      const current = await stat(path)
      if (bytes.length !== expectedSize || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs ||
        current.ino !== after.ino || current.size !== after.size || current.mtimeMs !== after.mtimeMs || current.ctimeMs !== after.ctimeMs) throw new Error('Save changed during read')
      return bytes
    } finally { await file.close() }
  }
  const first = await read()
  await delay(quietMs)
  const second = await read()
  if (!first.equals(second)) throw new Error('Save changed between reads')
  return second
}
