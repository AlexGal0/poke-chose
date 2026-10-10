import type { FieldMove } from '../domain/field-moves.ts'

type T = (key: string) => string
export function fieldMoveLabel(t: T, move: FieldMove): string {
  return t(`fieldMoves.moves.${move}`)
}
