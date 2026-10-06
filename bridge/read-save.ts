import { open, stat } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { SAVE_SIZE } from './parser.ts'

async function readOnce(path: string): Promise<Buffer> {
  const file = await open(path, 'r') // Never open a save for writing.
  try {
    const before = await file.stat()
    if (!before.isFile() || before.size !== SAVE_SIZE) throw new Error('Save inválido o incompleto: se esperan 512 KiB.')
    const bytes = await file.readFile()
    const after = await file.stat()
    const current = await stat(path)
    if (bytes.length !== SAVE_SIZE || before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs || current.ino !== after.ino || current.mtimeMs !== after.mtimeMs) {
      throw new Error('El save todavía está cambiando; se reintentará la lectura.')
    }
    return bytes
  } finally { await file.close() }
}

export async function readStableSave(path: string, quietMs = 120): Promise<Buffer> {
  const first = await readOnce(path)
  await delay(quietMs)
  const second = await readOnce(path)
  if (!first.equals(second)) throw new Error('El save todavía está cambiando; se reintentará la lectura.')
  return second
}
