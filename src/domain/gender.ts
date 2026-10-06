export interface SpeciesGender { kind: 'both' | 'male' | 'female' | 'genderless'; icon: string }

export function speciesGender(rate: unknown): SpeciesGender | null {
  if (typeof rate !== 'number' || !Number.isInteger(rate) || rate < -1 || rate > 8) return null
  if (rate === -1) return { kind: 'genderless', icon: '⚲' }
  if (rate === 0) return { kind: 'male', icon: '♂' }
  if (rate === 8) return { kind: 'female', icon: '♀' }
  return { kind: 'both', icon: '♂♀' }
}
