import type { LearnsetResponse } from './moves.ts'
import { statsResource } from './stats.ts'

export const FIELD_MOVES = ['cut', 'fly', 'surf', 'strength', 'waterfall', 'dive', 'flash', 'dig'] as const
export type FieldMove = typeof FIELD_MOVES[number]
export type FieldMovePokemon = { id: number; form?: number; isEgg?: boolean }

export function fieldMoveResource(pokemon: FieldMovePokemon): string {
  return statsResource(pokemon.id, pokemon.form ?? 0)
}

export function blackWhiteFieldMoves(data: LearnsetResponse): FieldMove[] {
  if (!Array.isArray(data.moves)) throw new Error('Missing learnset')
  return FIELD_MOVES.filter(move => data.moves.some(entry => entry.move.name === move &&
    entry.version_group_details.some(detail => detail.version_group.name === 'black-white' && detail.move_learn_method.name === 'machine')))
}

export function matchesFieldMove(pokemon: FieldMovePokemon, selected: readonly FieldMove[], moves?: readonly FieldMove[]): boolean {
  return selected.length === 0 || (!pokemon.isEgg && moves !== undefined && selected.every(move => moves.includes(move)))
}
