import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { createPokedexBridge } from './pokedex-server.ts'
import { ySaveReader } from '../src/games/y/save-pokedex.ts'

async function configuredPath() {
  let path = process.env.CITRA_Y_SAVE_PATH?.trim()
  if (!path) {
    try {
      const config: unknown = JSON.parse(await readFile(resolve('y-save.config.local.json'), 'utf8'))
      if (!config || typeof config !== 'object' || !('savePath' in config) || typeof config.savePath !== 'string') throw new Error('La configuración debe contener savePath como texto.')
      path = config.savePath.trim()
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }
  }
  if (!path) return null
  if (basename(path).toLowerCase() !== 'main') throw new Error('Configura el archivo main de Pokémon Y.')
  return resolve(path)
}
try {
  const port = Number(process.env.Y_SAVE_BRIDGE_PORT ?? 15306)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Y_SAVE_BRIDGE_PORT inválido.')
  const bridge = createPokedexBridge(await configuredPath(), 'y-save', ySaveReader)
  bridge.server.on('error', error => { console.error('[y-save]', error.message); process.exitCode = 1; void bridge.close().catch(() => {}) })
  bridge.server.listen(port, '127.0.0.1', () => console.log(`[y-save] Bridge de solo lectura: http://127.0.0.1:${port}`))
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void bridge.close() })
} catch (error) { console.error('[y-save]', error instanceof Error ? error.message : error); process.exitCode = 1 }
