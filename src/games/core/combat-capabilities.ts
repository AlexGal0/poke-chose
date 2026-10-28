import type { CombatFormat } from './combat.ts'

export interface GameCombatCapabilities {
  gameId: string
  // Formats that exist in this game, independently of any data source.
  formats: readonly CombatFormat[]
}

export interface CombatReaderCapabilities {
  gameId: string
  readerId: string
  // Only implemented, validated formats. Presence does not mean connected.
  formats: readonly CombatFormat[]
}

export type CombatFormatAvailability = 'readable' | 'pending' | 'unavailable'

export function sameCombatFormat(first: CombatFormat, second: CombatFormat): boolean {
  return first.kind === second.kind && first.id === second.id &&
    (first.kind !== 'special' || (second.kind === 'special' && first.gameId === second.gameId))
}

export function combatFormatAvailability(game: GameCombatCapabilities, reader: CombatReaderCapabilities | null, format: CombatFormat): CombatFormatAvailability {
  if ((format.kind === 'special' && format.gameId !== game.gameId) || !game.formats.some(candidate => sameCombatFormat(candidate, format))) return 'unavailable'
  return reader?.gameId === game.gameId && reader.formats.some(candidate => sameCombatFormat(candidate, format)) ? 'readable' : 'pending'
}
