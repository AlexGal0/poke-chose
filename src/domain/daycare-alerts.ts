import type { DaycareReading } from '../games/core/daycare.ts'
import type { ExperienceLevel } from '../api/experience.ts'
import { daycareEvolutionAlert } from './daycare-evolution.ts'
import { experienceProgress, levelFromExperience } from './experience.ts'

export interface DaycareEvolutionData { levels: ExperienceLevel[]; target: number | null }

export function daycareAlerts(reading: DaycareReading, species: ReadonlyMap<number, DaycareEvolutionData>) {
  if (!reading.available || reading.stale || !reading.data) return { egg: false, evolutions: [] }
  const evolutions = reading.data.slots.flatMap((member, index) => {
    const info = member && species.get(member.speciesId)
    if (!member || !info || info.target == null) return []
    const level = levelFromExperience(member.experience, info.levels)
    if (level == null) return []
    const progress = experienceProgress(level, member.experience, info.levels)
    const alert = daycareEvolutionAlert(level, info.target, progress?.remaining ?? null)
    return alert ? [{ slot: index + 1, alert }] : []
  })
  return { egg: reading.data.eggAvailable, evolutions }
}
