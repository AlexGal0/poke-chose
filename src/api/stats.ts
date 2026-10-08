import { STATS, isBaseStats, statsResource } from '../domain/stats.ts'
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

const generations = ['generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v', 'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix']

export function baseStatsFromResponse(data: StatsResponse): BaseStats {
  if (!Array.isArray(data.stats) || !Array.isArray(data.past_stats)) throw new Error('Missing stat history')
  const stats = {} as BaseStats
  for (const stat of STATS) {
    const current = data.stats.filter(entry => entry.stat.name === stat)
    if (current.length !== 1) throw new Error('Incomplete or duplicated stats')
    // History is sparse and each entry ends inclusively at its generation.
    // Resolve the earliest applicable history separately for EACH stat.
    const past = data.past_stats.filter(entry => generations.indexOf(entry.generation.name) >= 4 && entry.stats.some(value => value.stat.name === stat))
      .sort((a, b) => generations.indexOf(a.generation.name) - generations.indexOf(b.generation.name))[0]
    const historical = past?.stats.filter(entry => entry.stat.name === stat)
    if (historical && historical.length !== 1) throw new Error('Duplicated historical stat')
    stats[stat] = historical ? historical[0].base_stat : current[0].base_stat
  }
  if (!isBaseStats(stats)) throw new Error('Invalid base stats')
  return stats
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
