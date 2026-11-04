import type { FieldMove, FieldMoveService } from '../../domain/field-moves.ts'
import { xyPokemon } from './pokemon.ts'

export const xyCollectionMoves: FieldMoveService = {
  id: 'x-y', moves: ['cut', 'fly', 'surf', 'strength', 'waterfall', 'flash', 'dig', 'rock-smash'],
  resource: pokemon => `${pokemon.id}:${pokemon.form ?? 0}`,
  async load(resource) {
    if (!/^\d+:\d+$/.test(resource)) throw new Error('Invalid XY collection resource')
    const [speciesId, form] = resource.split(':').map(Number)
    const pokemon = await xyPokemon({ speciesId, form })
    const { publicFieldMoves: data } = await import('../x/field-move-data.ts')
    const moves = data[pokemon.resourceName!]
    if (!moves || moves.some(move => !xyCollectionMoves.moves.includes(move as FieldMove))) throw new Error('Missing XY compatibility')
    return moves as FieldMove[]
  },
}
