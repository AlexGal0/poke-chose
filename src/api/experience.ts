import { request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'

export interface ExperienceLevel { level: number; experience: number }
export async function getExperienceLevels(speciesId: number, signal?: AbortSignal): Promise<ExperienceLevel[]> {
  const key = `experience-v1-${speciesId}`
  const cached = readCache<ExperienceLevel[]>(key)
  if (validLevels(cached)) return cached
  const species = await request<{ growth_rate: { name: string } }>(`pokemon-species/${speciesId}`, signal)
  const growth = await request<{ levels: ExperienceLevel[] }>(`growth-rate/${species.growth_rate.name}`, signal)
  if (!validLevels(growth.levels)) throw new Error('Tabla de experiencia no válida.')
  writeCache(key, growth.levels)
  return growth.levels
}
function validLevels(value: unknown): value is ExperienceLevel[] {
  return Array.isArray(value) && value.length === 100 && new Set(value.map(row => row?.level)).size === 100 &&
    value.every(row => Number.isInteger(row?.level) && row.level >= 1 && row.level <= 100 && Number.isInteger(row.experience) && row.experience >= 0)
}
