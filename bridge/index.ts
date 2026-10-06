import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { createSaveBridge } from './server.ts'

async function configuredPath(): Promise<string | null> {
  let path = process.env.MELONDS_SAVE_PATH?.trim()
  if (!path) {
    try {
      const config: unknown = JSON.parse(await readFile(resolve('save.config.local.json'), 'utf8'))
      if (!config || typeof config !== 'object' || !('savePath' in config) || typeof config.savePath !== 'string') throw new Error('La configuración debe contener savePath como texto.')
      path = config.savePath.trim()
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }
  }
  if (!path) return null
  if (extname(path).toLowerCase() !== '.sav') throw new Error('Configura un archivo .sav RAW de Black/White.')
  return resolve(path)
}

try {
  const port = Number(process.env.SAVE_BRIDGE_PORT ?? 3001)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('SAVE_BRIDGE_PORT inválido.')
  const bridge = createSaveBridge(await configuredPath())
  bridge.server.on('error', error => { console.error('[save]', error.message); process.exitCode = 1; void bridge.close().catch(() => {}) })
  bridge.server.listen(port, '127.0.0.1', () => console.log(`[save] Bridge de solo lectura: http://127.0.0.1:${port}`))
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void bridge.close() })
} catch (error) {
  console.error('[save]', error instanceof Error ? error.message : error)
  process.exitCode = 1
}
