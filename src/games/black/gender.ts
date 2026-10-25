import type { GenderDistribution } from '../../models/gender-distribution.ts'

export function blackGenderDistribution(rate: number): GenderDistribution | null {
  if (rate === 0) return { male: 100, female: 0 }
  if (rate === 8) return { male: 0, female: 100 }
  const threshold = ({ 1: 31, 2: 63, 4: 127, 6: 191, 7: 225 } as Record<number, number>)[rate]
  if (!Number.isInteger(rate) || threshold === undefined) return null
  // Gen V: the low PID byte ranges from 0 through 255.
  const female = threshold / 256 * 100
  return { male: 100 - female, female }
}
