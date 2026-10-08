import { request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'

export interface ExperienceLevel { level: number; experience: number }
const speciesRequests = new Map<number, Promise<ExperienceLevel[]>>()
const growthRequests = new Map<string, Promise<ExperienceLevel[]>>()
export async function getExperienceLevels(speciesId: number, signal?: AbortSignal): Promise<ExperienceLevel[]> {
  signal?.throwIfAborted()
  let pending = speciesRequests.get(speciesId)
  if (!pending) {
    pending = loadExperienceLevels(speciesId)
    speciesRequests.set(speciesId, pending)
    void pending.catch(() => speciesRequests.delete(speciesId))
  }
  const levels = await pending
  signal?.throwIfAborted()
  return levels
}
async function loadExperienceLevels(speciesId: number): Promise<ExperienceLevel[]> {
  const key = `experience-v1-${speciesId}`
  const cached = readCache<ExperienceLevel[]>(key)
  if (validLevels(cached)) return cached
  const species = await request<{ growth_rate: { name: string } }>(`pokemon-species/${speciesId}`)
  const name = species.growth_rate.name
  let pending = growthRequests.get(name)
  if (!pending) {
    pending = loadGrowth(name)
    growthRequests.set(name, pending)
    void pending.catch(() => growthRequests.delete(name))
  }
  const levels = await pending
  writeCache(key, levels)
  return levels
}
async function loadGrowth(name: string): Promise<ExperienceLevel[]> {
  const key = `experience-growth-v1-${name}`
  const cached = readCache<ExperienceLevel[]>(key)
  if (validLevels(cached)) return cached
  const growth = await request<{ levels: ExperienceLevel[] }>(`growth-rate/${name}`)
  if (!validLevels(growth.levels)) throw new Error('Tabla de experiencia no válida.')
  writeCache(key, growth.levels)
  return growth.levels
}
function validLevels(value: unknown): value is ExperienceLevel[] {
  return Array.isArray(value) && value.length === 100 && new Set(value.map(row => row?.level)).size === 100 &&
    value.every(row => Number.isInteger(row?.level) && row.level >= 1 && row.level <= 100 && Number.isInteger(row.experience) && row.experience >= 0) &&
    [...value].sort((a, b) => a.level - b.level).every((row, index, rows) => index === 0 || row.experience > rows[index - 1].experience)
}
