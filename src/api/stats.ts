import { historicalBaseStats } from '../domain/species-knowledge.ts'
import { isBaseStats, statsResource } from '../domain/stats.ts'
import type { BaseStats } from '../domain/stats.ts'
import { readCache, writeCache } from '../storage/local.ts'
import { request } from './pokeapi.ts'

interface StatEntry { base_stat: number; stat: { name: string } }
export interface StatsResponse {
  id: number
  name: string
  stats: StatEntry[]
  past_stats: { generation: { name: string }; stats: StatEntry[] }[]
}

export function baseStatsFromResponse(data: StatsResponse): BaseStats {
  return historicalBaseStats(data, 5)
}

export async function getBaseStats(speciesId: number, form = 0, signal?: AbortSignal): Promise<BaseStats> {
  const resource = statsResource(speciesId, form)
  // Numeric data is locale-free; labels are translated at render time.
  const key = `base-stats-bw-v1-${resource}`
  const cached = readCache<{ resource: string; stats: BaseStats }>(key)
  if (cached?.resource === resource && isBaseStats(cached.stats)) return cached.stats
  const data = await request<StatsResponse>(`pokemon/${resource}`, signal)
  if (Number.isNaN(Number(resource)) ? data.name !== resource : data.id !== speciesId) throw new Error('Unexpected Pokémon stats')
  const stats = baseStatsFromResponse(data)
  writeCache(key, { resource, stats })
  return stats
}
