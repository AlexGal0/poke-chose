import { getSavePokemon } from '../../api/pokeapi.ts'
import { getExperienceLevels } from '../../api/experience.ts'
import { getEvolutionFamily, getEvolutionSpecies } from '../../api/evolution.ts'
import { nextEvolutionLevel } from '../../domain/daycare-evolution.ts'
import type { DaycareReading, DaycareService } from '../core/daycare.ts'
import type { DaycareState } from '../../models/party.ts'

export const blackDaycareService: DaycareService = {
  resolve: getSavePokemon,
  experienceLevels: getExperienceLevels,
  async evolutionLevel(id, signal) {
    const species = await getEvolutionSpecies(id, signal)
    return nextEvolutionLevel(await getEvolutionFamily(species, signal), id)
  },
}

export function blackDaycareReading(data: DaycareState | null, stale: boolean, available: boolean): DaycareReading {
  return { available, stale, data: available && data ? {
    eggAvailable: data.eggAvailable,
    slots: data.slots.map(member => member ? {
      speciesId: member.speciesId, form: member.form, nickname: member.nickname, gender: member.gender,
      experience: member.experience + member.gainedExperience,
    } : null),
  } : null }
}
