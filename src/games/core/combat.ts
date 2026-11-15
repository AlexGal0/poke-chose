import type { CombatParticipant } from '../../models/combat.ts'

export type GeneralCombatFormat = 'single' | 'double' | 'horde'
export type CombatFormat =
  | { kind: 'general'; id: GeneralCombatFormat }
  | { kind: 'special'; gameId: string; id: string }

// Unknown is a read gap, never a confirmed absence or a zero count.
export type CombatValue<T> = { state: 'known'; value: T } | { state: 'unknown' }
export type CombatSideId = 'player' | 'opponent'

export interface CombatOwner {
  // Owners are scoped to a side, not a game or a data source. A double may
  // have one player + one ally versus two separate opposing trainers.
  id: string
  control: 'player' | 'ally' | 'opponent' | 'wild'
}

export interface FieldPokemon extends Omit<CombatParticipant, 'slot'> {
  ownerId: string
  // Index within this owner's party, independently of the field position.
  partySlot: number | null
}

export type CombatPosition = { id: string } & (
  | { state: 'unknown' }
  | { state: 'empty' }
  | { state: 'occupied'; pokemon: FieldPokemon }
)

export interface CombatSide {
  id: CombatSideId
  // Several owners can share a side; the controlled player's party remains
  // separate from allied parties. Every occupied position references an owner.
  owners: readonly CombatOwner[]
  // Stable IDs scoped to this side; retain positions after fainting or removal.
  positions: readonly CombatPosition[]
  // Whole side's initial roster across all owners, including reserves. This
  // can exceed one party's size; it reveals no reserve species.
  rosterTotal: CombatValue<number>
}

export interface CombatField {
  // Adapter-confirmed format. Never derive it from the number still alive.
  format: CombatValue<CombatFormat>
  sides: readonly [CombatSide & { id: 'player' }, CombatSide & { id: 'opponent' }]
}

export type FieldCombatReading = {
  status: 'ready' | 'waiting' | 'error'
  // Stable protocol code; the presentation translates it.
  messageCode: string | null
  // Optional controlled player's roster, including reserves and eggs. Null or
  // absent is an unavailable read, while [] confirms an empty roster.
  playerTeam?: readonly FieldPokemon[] | null
} & (
  | { activity: 'inactive'; field: null }
  | { activity: 'unknown'; field: CombatField | null }
  | { activity: 'active'; field: CombatField }
)

// Slot capacity, not a requirement that every position has a known occupant.
export const GENERAL_COMBAT_POSITIONS: Readonly<Record<GeneralCombatFormat, readonly [number, number]>> = {
  single: [1, 1],
  double: [2, 2],
  horde: [1, 5],
}
