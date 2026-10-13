import { localizedName, request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'
export interface EvolutionItemInfo { name: string; gameIndex: number | null }
export async function getEvolutionItem(name: string, locale: string, signal?: AbortSignal): Promise<EvolutionItemInfo> {
  const key = `evolution-item-bw-${locale}-v1-${name}`
  const cached = readCache<EvolutionItemInfo>(key)
  if (cached && typeof cached.name === 'string' && (cached.gameIndex === null || (Number.isInteger(cached.gameIndex) && cached.gameIndex! >= 1 && cached.gameIndex! <= 638))) return cached
  const item = await request<{ name: string; names: { name: string; language: { name: string } }[]; game_indices: { game_index: number; generation: { name: string } }[] }>(`item/${name}`, signal)
  const result = { name: localizedName(item.names, locale) ?? item.name, gameIndex: item.game_indices.find(index => index.generation.name === 'generation-v')?.game_index ?? null }
  writeCache(key, result)
  return result
}
