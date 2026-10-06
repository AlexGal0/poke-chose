export interface SpeciesGender { kind: 'both' | 'male' | 'female' | 'genderless'; icon: string; label: string }

export function speciesGender(rate: unknown): SpeciesGender | null {
  if (typeof rate !== 'number' || !Number.isInteger(rate) || rate < -1 || rate > 8) return null
  if (rate === -1) return { kind: 'genderless', icon: '⚲', label: 'Especie sin sexo' }
  if (rate === 0) return { kind: 'male', icon: '♂', label: 'Especie solo macho' }
  if (rate === 8) return { kind: 'female', icon: '♀', label: 'Especie solo hembra' }
  return { kind: 'both', icon: '♂♀', label: 'La especie puede ser macho o hembra' }
}
