import type { SavedPokemonData } from '../models/party.ts'

type Identity = Pick<SavedPokemonData, 'personality' | 'trainerId' | 'speciesId'>

// Follow a specimen across party slots and boxes; never substitute a namesake.
// Ambiguous identities (for example cloned records) require the original slot.
export function findIndividual<T extends Identity & { instanceKey?: string }>(selected: Identity & { instanceKey?: string }, candidates: readonly T[]): T | undefined {
  const matches = candidates.filter(candidate => candidate.personality === selected.personality && candidate.trainerId === selected.trainerId && candidate.speciesId === selected.speciesId)
  return matches.length === 1 ? matches[0] : matches.find(candidate => candidate.instanceKey !== undefined && candidate.instanceKey === selected.instanceKey)
}
