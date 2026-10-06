import { getEvolutionSpecies } from './evolution.ts'
import type { EvolutionSpecies } from './evolution.ts'
import { request } from './pokeapi.ts'
import { writeCache } from '../storage/local.ts'
import { speciesGender } from '../domain/gender.ts'
import type { SpeciesGender } from '../domain/gender.ts'

const pending = new Map<number, Promise<SpeciesGender | null>>()

export function getSpeciesGender(speciesId: number): Promise<SpeciesGender | null> {
  const existing = pending.get(speciesId)
  if (existing) return existing
  const load = async () => {
    let species = await getEvolutionSpecies(speciesId)
    // Old species caches may predate the gender field. Refresh once rather than guessing.
    if (species.gender_rate === undefined) {
      species = await request<EvolutionSpecies>(`pokemon-species/${speciesId}`)
      writeCache(`evolution-v1-pokemon-species/${speciesId}`, species)
    }
    return speciesGender(species.gender_rate)
  }
  const promise = load().finally(() => pending.delete(speciesId))
  pending.set(speciesId, promise)
  return promise
}
