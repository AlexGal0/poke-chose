import type { ManualPokemon } from './catalog.ts'
import type { SavedPartyMember, SavedBoxPokemon, SavedPokemonData } from '../../models/party.ts'
import type { ExperienceLevel } from '../../api/experience.ts'
import type { BaseStats } from '../../domain/stats.ts'
import type { KnowledgeMove } from '../../domain/species-knowledge.ts'
import { levelFromExperience } from '../../domain/experience.ts'

export type KnownRosterMove = Omit<KnowledgeMove, 'level'> & { slot: number; id: number; power: number | null; accuracy: number | null }
export interface RosterDescription { moves: string[]; ability: string; item: string; knownMoves?: KnownRosterMove[] }
export interface RosterIndividual { pokemon: SavedRosterPokemon; service: SavedRosterService }

export type SavedRosterPokemon = ManualPokemon & SavedPokemonData & {
  instanceKey: string
  location: 'party' | 'box'
  slot: number
  box: number | null
  level: number | null
  partyMember?: SavedPartyMember
  experienceLevels?: ExperienceLevel[]
  baseStats?: BaseStats
  hatchCycles?: number
}
export interface SavedRosterService {
  hatching?: { stepsPerCycle: number }
  resolve(member: SavedPokemonData, signal?: AbortSignal): Promise<ManualPokemon & { experienceLevels?: ExperienceLevel[]; baseStats?: BaseStats; hatchCycles?: number }>
  describe(member: SavedPokemonData, locale: string, signal?: AbortSignal): Promise<RosterDescription>
}

export interface RosterResolution {
  key: string
  sourceKey: string
  service: SavedRosterService
  party: SavedRosterPokemon[] | null
  collection: SavedRosterPokemon[] | null
  error: boolean
}

// Keep a pending update's previous roster only within the same source and resolver.
export function visibleRosterResolution(result: RosterResolution | null, key: string | null, sourceKey: string, service: SavedRosterService) {
  return key !== null && result?.sourceKey === sourceKey && result.service === service ? result : null
}

export function findRosterIndividual(selected: SavedRosterPokemon, roster: readonly SavedRosterPokemon[]) {
  const matches = roster.filter(p => !p.isEgg && p.personality === selected.personality && p.trainerId === selected.trainerId && p.speciesId === selected.speciesId)
  return matches.find(p => p.instanceKey === selected.instanceKey) ?? (matches.length === 1 ? matches[0] : undefined)
}
export async function resolveSavedRoster(service: SavedRosterService, party: SavedPartyMember[], boxes: SavedBoxPokemon[], signal?: AbortSignal) {
  const unique = new Map<string, ReturnType<SavedRosterService['resolve']>>()
  const resolve = (member: SavedPokemonData) => {
    const key = `${member.speciesId}:${member.form}`
    if (!unique.has(key)) unique.set(key, service.resolve(member, signal))
    return unique.get(key)!
  }
  async function memberData(member: SavedPartyMember | SavedBoxPokemon): Promise<SavedRosterPokemon> {
    const location = 'box' in member ? 'box' : 'party'
    const box = 'box' in member ? member.box : null
    const species = await resolve(member)
    const level = location === 'party' ? (member as SavedPartyMember).level
      : !member.isEgg && member.experience != null && species.experienceLevels
        ? levelFromExperience(member.experience, species.experienceLevels) : null
    return { ...species, ...member, location, box,
      level, partyMember: location === 'party' ? member as SavedPartyMember : undefined,
      instanceKey: `${location}:${box ?? ''}:${member.slot}:${member.personality}:${member.trainerId}` }
  }
  const team = await Promise.all(party.map(memberData))
  const stored = await Promise.all(boxes.map(memberData))
  return { party: team, collection: [...team, ...stored] }
}
