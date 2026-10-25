import type { FieldMove, FieldMoveService } from '../../domain/field-moves.ts'
import { xSavedPokemon } from './saved-roster.ts'

export const xCollectionMoves: FieldMoveService = {
  id: 'x-y', moves: ['cut', 'fly', 'surf', 'strength', 'waterfall', 'flash', 'dig', 'rock-smash'],
  resource: pokemon => `${pokemon.id}:${pokemon.form ?? 0}`,
  async load(resource) {
    if (!/^\d+:\d+$/.test(resource)) throw new Error('Invalid XY collection resource')
    const [speciesId, form] = resource.split(':').map(Number)
    const pokemon = await xSavedPokemon({ speciesId, form })
    const { publicFieldMoves: data } = await import('./field-move-data.ts')
    const moves = data[pokemon.resourceName!]
    if (!moves || moves.some(move => !xCollectionMoves.moves.includes(move as FieldMove))) throw new Error('Missing XY compatibility')
    return moves as FieldMove[]
  },
}
