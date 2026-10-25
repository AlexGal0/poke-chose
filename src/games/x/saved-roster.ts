import type { BaseStats } from '../../domain/stats.ts'
import type { KnownRosterMove } from '../core/saved-roster.ts'
import { xCatalogRules } from './catalog.ts'
import type { SavedRosterService } from '../core/saved-roster.ts'
import type { SavedPokemonData } from '../../models/party.ts'
import type { ManualPokemon } from '../core/catalog.ts'
import type { ExperienceLevel } from '../../api/experience.ts'
import hatchData from './data/hatch-cycles.json' with { type: 'json' }
const publicData = async () => (await import('./roster-data.ts')).publicRosterData

// PK6 indices are explicit; PokéAPI variety order is not the save's form order.
const variants: Record<number, string[]> = {
  351: ['castform', 'castform-sunny', 'castform-rainy', 'castform-snowy'],
  386: ['deoxys-normal', 'deoxys-attack', 'deoxys-defense', 'deoxys-speed'],
  413: ['wormadam-plant', 'wormadam-sandy', 'wormadam-trash'],
  479: ['rotom', 'rotom-heat', 'rotom-wash', 'rotom-frost', 'rotom-fan', 'rotom-mow'],
  487: ['giratina-altered', 'giratina-origin'], 492: ['shaymin-land', 'shaymin-sky'],
  550: ['basculin-red-striped', 'basculin-blue-striped'], 555: ['darmanitan-standard', 'darmanitan-zen'],
  641: ['tornadus-incarnate', 'tornadus-therian'], 642: ['thundurus-incarnate', 'thundurus-therian'],
  645: ['landorus-incarnate', 'landorus-therian'], 646: ['kyurem', 'kyurem-white', 'kyurem-black'],
  647: ['keldeo-ordinary', 'keldeo-resolute'], 648: ['meloetta-aria', 'meloetta-pirouette'],
  678: ['meowstic-male', 'meowstic-female'], 681: ['aegislash-shield', 'aegislash-blade'],
  710: ['pumpkaboo-small', 'pumpkaboo-average', 'pumpkaboo-large', 'pumpkaboo-super'],
  711: ['gourgeist-small', 'gourgeist-average', 'gourgeist-large', 'gourgeist-super'],
}
const megaSpecies = [3, 9, 65, 94, 115, 127, 130, 142, 181, 212, 214, 229, 248, 257, 282, 303, 306, 308, 310, 354, 359, 380, 381, 445, 448, 460]
const cosmeticMax: Record<number, number> = { 201: 27, 412: 2, 421: 1, 422: 1, 423: 1, 585: 3, 586: 3, 649: 4, 664: 19, 665: 19, 666: 19, 669: 4, 670: 5, 671: 4, 676: 9, 716: 1 }
const arceusTypes = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy']
export async function xSavedPokemon(member: Pick<SavedPokemonData, 'speciesId' | 'form'>): Promise<ManualPokemon & { experienceLevels: ExperienceLevel[]; baseStats: BaseStats; hatchCycles: number }> {
  const data = await publicData()
  const { speciesId, form } = member
  if (!Number.isInteger(form) || form < 0 || form > 31) throw new Error('Unsupported X form')
  const base = data.catalog.find(row => row.id === speciesId && row.isDefault)
  if (!base) throw new Error('Unsupported X species')
  let resourceName = base.resourceName
  if (variants[speciesId]) resourceName = variants[speciesId][form]
  else if ([6, 150].includes(speciesId)) resourceName = [base.resourceName, `${base.name}-mega-x`, `${base.name}-mega-y`][form]
  else if (megaSpecies.includes(speciesId)) resourceName = [base.resourceName, `${base.name}-mega`][form]
  else if (speciesId === 493 ? form >= arceusTypes.length : form !== 0 && form > (cosmeticMax[speciesId] ?? -1)) throw new Error('Unsupported X form')
  const pokemon = data.catalog.find(row => row.id === speciesId && row.resourceName === resourceName)
  if (!pokemon) throw new Error('Unsupported X form')
  return { id: speciesId, name: base.name, resourceName, sprite: pokemon.sprite, baseStats: pokemon.baseStats, hatchCycles: (hatchData.cycles as Record<string, number>)[speciesId], experienceLevels: (data.experience as Record<string, ExperienceLevel[]>)[base.growthRate],
    types: speciesId === 493 ? [arceusTypes[form]] : pokemon.types }
}
export async function xSavedDescription(member: SavedPokemonData, locale: string) {
  const data = await publicData()
  const localized = (table: Record<string, string>, id: number) => table[`${id}:${locale}`] ?? table[`${id}:en`] ?? String(id)
  const itemId = (data.itemIndices as Record<string, number>)[member.heldItemId]
  if (member.heldItemId !== 0 && !itemId) throw new Error('Unknown X item')
  const moveData = (await import('./move-data.ts')).publicMoveData
  const knownMoves = member.moveIds.flatMap((id, slot) => {
    if (!id) return []
    const move = moveData.moves.find(move => move.id === id)
    if (!move || !xCatalogRules.types.includes(move.type)) throw new Error('Unknown X move')
    const text = move.localized[locale === 'es' ? 'es' : 'en']
    return [{ ...move, ...text, descriptionVersionGroup: null, categoryId: move.categoryId as KnownRosterMove['categoryId'], slot }]
  })
  return { knownMoves, moves: member.moveIds.filter(id => id !== 0).map(id => localized(data.moves, id)),
    ability: member.abilityId ? localized(data.abilities, member.abilityId) : '', item: itemId ? localized(data.items, itemId) : '' }
}
// Entirely local: no save-derived queries or sprite URLs leave the application.
export const xSavedRosterService: SavedRosterService = {
  hatching: { stepsPerCycle: 257 },
  resolve: async member => xSavedPokemon(member),
  describe: async (member, locale) => xSavedDescription(member, locale),
}
