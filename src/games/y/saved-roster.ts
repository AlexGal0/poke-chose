import { xyPokemon as ySavedPokemon } from '../xy/pokemon.ts'
export { xyPokemon as ySavedPokemon } from '../xy/pokemon.ts'
import type { KnownRosterMove } from '../core/saved-roster.ts'
import { yCatalogRules } from './catalog.ts'
import type { SavedRosterService } from '../core/saved-roster.ts'
import type { SavedPokemonData } from '../../models/party.ts'
const publicData = async () => (await import('../x/roster-data.ts')).publicRosterData

export async function ySavedDescription(member: SavedPokemonData, locale: string) {
  const data = await publicData()
  const localized = (table: Record<string, string>, id: number) => table[`${id}:${locale}`] ?? table[`${id}:en`] ?? String(id)
  const itemId = (data.itemIndices as Record<string, number>)[member.heldItemId]
  if (member.heldItemId !== 0 && !itemId) throw new Error('Unknown X item')
  const moveData = (await import('../x/move-data.ts')).publicMoveData
  const knownMoves = member.moveIds.flatMap((id, slot) => {
    if (!id) return []
    const move = moveData.moves.find(move => move.id === id)
    if (!move || !yCatalogRules.types.includes(move.type)) throw new Error('Unknown X move')
    const text = move.localized[locale === 'es' ? 'es' : 'en']
    return [{ ...move, ...text, descriptionVersionGroup: null, categoryId: move.categoryId as KnownRosterMove['categoryId'], slot }]
  })
  return { knownMoves, moves: member.moveIds.filter(id => id !== 0).map(id => localized(data.moves, id)),
    ability: member.abilityId ? localized(data.abilities, member.abilityId) : '', item: itemId ? localized(data.items, itemId) : '' }
}
// Entirely local: no save-derived queries or sprite URLs leave the application.
export const ySavedRosterService: SavedRosterService = {
  hatching: { stepsPerCycle: 257 },
  resolve: async member => ySavedPokemon(member),
  describe: async (member, locale) => ySavedDescription(member, locale),
}
