import type { ExperienceLevel } from '../api/experience.ts'

export function levelFromExperience(experience: number, levels: ExperienceLevel[]): number | null {
  if (!Number.isInteger(experience) || experience < 0 || levels.length !== 100) return null
  const sorted = [...levels].sort((a, b) => a.level - b.level)
  if (sorted.some((row, index) => row.level !== index + 1 || !Number.isInteger(row.experience) ||
    row.experience < 0 || (index > 0 && row.experience <= sorted[index - 1].experience))) return null
  if (experience < sorted[0].experience) return null
  return sorted.findLast(row => row.experience <= experience)!.level
}

export function experienceProgress(level: number, experience: number, levels: ExperienceLevel[]) {
  if (level === 100) return { value: 1, max: 1, remaining: 0 }
  const start = levels.find(row => row.level === level)?.experience
  const end = levels.find(row => row.level === level + 1)?.experience
  if (start === undefined || end === undefined || end <= start || experience < start || experience >= end) return null
  return { value: experience - start, max: end - start, remaining: end - experience }
}
