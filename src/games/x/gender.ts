import type { GenderDistribution } from '../../models/gender-distribution.ts'

export function xGenderDistribution(rate: number): GenderDistribution | null {
  if (rate === 0) return { male: 100, female: 0 }
  if (rate === 8) return { male: 0, female: 100 }
  const threshold = ({ 1: 31, 2: 63, 4: 127, 6: 191, 7: 225 } as Record<number, number>)[rate]
  if (!Number.isInteger(rate) || threshold === undefined) return null
  // Gen VI: a separate roll ranges from 1 through 252.
  const female = (threshold - 1) / 252 * 100
  return { male: 100 - female, female }
}
