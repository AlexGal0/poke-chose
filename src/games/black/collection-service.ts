import { getFieldMoves } from '../../api/field-moves.ts'
import { FIELD_MOVES, fieldMoveResource } from '../../domain/field-moves.ts'
import type { FieldMoveService } from '../../domain/field-moves.ts'

export const blackCollectionMoves: FieldMoveService = {
  id: 'black-white', moves: FIELD_MOVES, resource: fieldMoveResource, load: getFieldMoves,
}
