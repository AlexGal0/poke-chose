import { localizedName, request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'

const pending = new Map<string, Promise<string>>()
let indices: Promise<Record<number, number>> | undefined

export function blackWhiteItemIndices(csv: string): Record<number, number> {
  const result: Record<number, number> = {}
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [itemId, generation, gameIndex] = line.split(',').map(Number)
    if (generation === 5 && Number.isInteger(itemId) && itemId > 0 && Number.isInteger(gameIndex) && gameIndex > 0) result[gameIndex] = itemId
  }
  if (!Object.keys(result).length) throw new Error('No se pudo consultar los objetos de Black/White.')
  return result
}

async function getIndices() {
  const cached = readCache<Record<number, number>>('item-indices-bw-v1')
  if (cached && typeof cached === 'object' && Object.keys(cached).length && Object.values(cached).every(id => Number.isInteger(id) && id > 0)) return cached
  if (!indices) indices = (async () => {
    const response = await fetch('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/item_game_indices.csv', { signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error('No se pudo consultar los objetos.')
    const result = blackWhiteItemIndices(await response.text())
    writeCache('item-indices-bw-v1', result)
    return result
  })().catch(error => { indices = undefined; throw error })
  return indices
}

export function getHeldItemName(gameIndex: number, locale: string): Promise<string> {
  if (gameIndex === 0) return Promise.resolve('')
  const key = `held-item-bw-${locale}-v1-${gameIndex}`
  const cached = readCache<string>(key)
  if (typeof cached === 'string' && cached.trim()) return Promise.resolve(cached)
  if (!pending.has(key)) pending.set(key, (async () => {
    const itemId = (await getIndices())[gameIndex]
    if (!itemId) throw new Error('Objeto no reconocido en Black/White.')
    const item = await request<{ name: string; names: { name: string; language: { name: string } }[] }>(`item/${itemId}`)
    const name = localizedName(item.names, locale) ?? item.name
    writeCache(key, name)
    return name
  })().finally(() => pending.delete(key)))
  return pending.get(key)!
}
