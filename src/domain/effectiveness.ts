import { generationVRules } from './type-rules.ts'
import { typeEffectiveness } from './type-analysis.ts'
import { TYPES } from '../models/pokemon.ts'
import type { Pokemon, PokemonType } from '../models/pokemon.ts'

// Compatibility API for existing Generation V consumers.
export function effectiveness(attack: PokemonType, defenders: readonly PokemonType[]): number {
  return typeEffectiveness(generationVRules, attack, defenders)
}

export function analyzeDefense(team: readonly Pokemon[]) {
  return TYPES.map(type => {
    const members = team.map(pokemon => ({ pokemon, multiplier: effectiveness(type, pokemon.types) }))
    return {
      type, members,
      weak: members.filter(member => member.multiplier > 1).length,
      neutral: members.filter(member => member.multiplier === 1).length,
      resistant: members.filter(member => member.multiplier > 0 && member.multiplier < 1).length,
      immune: members.filter(member => member.multiplier === 0).length,
    }
  })
}

// Accept attack types independently, so real move types can replace STAB later.
export function analyzeCoverage(attackTypes: readonly PokemonType[]) {
  const unique = [...new Set(attackTypes)]
  return TYPES.map(type => ({ type, attackers: unique.filter(attack => effectiveness(attack, [type]) > 1) }))
}

export function stabTypes(team: readonly Pokemon[]): PokemonType[] {
  return [...new Set(team.flatMap(pokemon => pokemon.types))]
}
