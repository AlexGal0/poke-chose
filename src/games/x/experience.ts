import { publicRosterData } from './roster-data.ts'
import { levelFromExperience } from '../../domain/experience.ts'
import type { ExperienceLevel } from '../../api/experience.ts'

export function xLevelFromExperience(speciesId: number, experience: number | undefined) {
  const species = publicRosterData.catalog.find(p => p.id === speciesId && p.isDefault)
  if (!species || experience === undefined) return null
  const levels = (publicRosterData.experience as Record<string, ExperienceLevel[]>)[species.growthRate]
  return levels ? levelFromExperience(experience, levels) : null
}
