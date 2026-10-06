import { request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'
import type { EncounterLocation, EncounterSpecies } from '../models/encounters.ts'
import { orderBlackZones } from '../domain/black-zones.ts'
import { withBlackNpcTrades } from '../domain/npc-trades.ts'

interface Resource { name: string; url: string }
interface EncounterDetail { min_level: number; max_level: number; chance: number; method: { name: string }; condition_values: { name: string }[] }
export interface EncounterAreaResponse {
  name: string
  pokemon_encounters: {
    pokemon: Resource
    version_details: { version: { name: string }; encounter_details: EncounterDetail[] }[]
  }[]
}
const resourceId = (url: string) => Number(url.split('/').filter(Boolean).at(-1))

// Original BW locations from PokéAPI locations.csv, excluding White-only forest/gate.
export function blackLocations(resources: Resource[]): EncounterLocation[] {
  return orderBlackZones(resources.map(resource => ({ id: resourceId(resource.url), name: resource.name }))
    .filter(location => location.id >= 346 && location.id <= 428 && location.id !== 393 && location.id !== 425))
}

export function collectBlackEncounters(areas: EncounterAreaResponse[]): EncounterSpecies[] {
  const species = new Map<number, EncounterSpecies>()
  for (const area of areas) for (const entry of area.pokemon_encounters) {
    // Exact version match: never White, Black 2, or a generation-wide union.
    const details = entry.version_details.filter(version => version.version.name === 'black').flatMap(version => version.encounter_details)
    if (!details.length) continue
    const speciesId = resourceId(entry.pokemon.url)
    if (!Number.isInteger(speciesId) || speciesId < 1) throw new Error('ID de encuentro inválido.')
    const row = species.get(speciesId) ?? { speciesId, name: entry.pokemon.name, details: [] }
    row.details.push(...details.map(detail => ({ area: area.name, method: detail.method.name, minLevel: detail.min_level, maxLevel: detail.max_level, chance: detail.chance, conditions: detail.condition_values.map(condition => condition.name) })))
    species.set(speciesId, row)
  }
  return [...species.values()].sort((a, b) => a.speciesId - b.speciesId)
}

export async function getBlackLocations(signal?: AbortSignal): Promise<EncounterLocation[]> {
  const cached = readCache<EncounterLocation[]>('black-locations-v1')
  if (Array.isArray(cached) && cached.every(row => Number.isInteger(row.id) && typeof row.name === 'string')) return orderBlackZones(cached.filter(row => row.id >= 346 && row.id <= 428 && row.id !== 393 && row.id !== 425))
  const region = await request<{ locations: Resource[] }>('region/unova', signal)
  const locations = blackLocations(region.locations)
  writeCache('black-locations-v1', locations)
  return locations
}

export async function getBlackEncounters(locationId: number, signal?: AbortSignal): Promise<EncounterSpecies[]> {
  const key = `black-encounters-v1-${locationId}`
  const cached = readCache<EncounterSpecies[]>(key)
  if (Array.isArray(cached) && cached.every(row => Number.isInteger(row.speciesId) && row.speciesId >= 1 && row.speciesId <= 649 && typeof row.name === 'string' && Array.isArray(row.details))) return withBlackNpcTrades(locationId, cached)
  const location = await request<{ areas: Resource[] }>(`location/${locationId}`, signal)
  const areas = await Promise.all(location.areas.map(area => request<EncounterAreaResponse>(`location-area/${resourceId(area.url)}`, signal)))
  const rows = collectBlackEncounters(areas)
  // References can use variety IDs, e.g. Basculin. Normalize to National species IDs.
  const normalized = await Promise.all(rows.map(async row => {
    if (row.speciesId <= 649) return row
    const variant = await request<{ species: Resource }>(`pokemon/${row.speciesId}`, signal)
    return { ...row, speciesId: resourceId(variant.species.url), name: variant.species.name }
  }))
  const merged = new Map<number, EncounterSpecies>()
  for (const row of normalized) {
    if (row.speciesId < 1 || row.speciesId > 649) throw new Error('Especie fuera de Gen V en encuentros de Black.')
    const previous = merged.get(row.speciesId)
    if (previous) previous.details.push(...row.details)
    else merged.set(row.speciesId, row)
  }
  const result = [...merged.values()].sort((a, b) => a.speciesId - b.speciesId)
  writeCache(key, result)
  return withBlackNpcTrades(locationId, result)
}
