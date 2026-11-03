import { statsForm } from '../../domain/stats.ts'
import { blackWhitePokedexScope } from '../../domain/pokedex-scope.ts'
import type { CatalogRules, CatalogService } from '../core/catalog.ts'
import { getCatalog, getPokemon } from '../../api/pokeapi.ts'
import { generationVRules } from '../../domain/type-rules.ts'
import { getSpeciesGender } from '../../api/gender.ts'

export const blackCatalogRules: CatalogRules = {
  id: 'black', generation: 5, maxSpecies: 649, introducedFrom: 494,
  regionalSpeciesIds: Array.from({ length: 156 }, (_, index) => index + 494),
  types: generationVRules.types, spriteGeneration: 'generation-v', spriteVersion: 'black-white',
}
export function blackSpeciesScope(id: number) {
  const scope = blackWhitePokedexScope(id)
  return scope ? { id: scope, labelKey: `pokedexScope.${scope}.label`, descriptionKey: `pokedexScope.${scope}.description` } : undefined
}
export const blackCatalog: CatalogService = {
  rules: blackCatalogRules,
  list: getCatalog,
  async get(entry, signal) {
    const pokemon = await getPokemon(entry.id, signal)
    const gender = await getSpeciesGender(entry.id).catch(() => null)
    signal?.throwIfAborted()
    return { ...pokemon, scope: blackSpeciesScope(pokemon.id), formLabelKey: statsForm(entry.id) ? `statistics.forms.${statsForm(entry.id)}` : undefined, speciesGender: gender?.kind, genderDistribution: gender?.distribution }
  },
}
