import type { ExperienceLevel } from '../api/experience.ts'

export function experienceProgress(level: number, experience: number, levels: ExperienceLevel[]) {
  if (level === 100) return { value: 1, max: 1, remaining: 0 }
  const start = levels.find(row => row.level === level)?.experience
  const end = levels.find(row => row.level === level + 1)?.experience
  if (start === undefined || end === undefined || end <= start || experience < start || experience >= end) return null
  return { value: experience - start, max: end - start, remaining: end - experience }
}
