// Compatibility boundary for Black's existing battle consumers.
import { generationVRules } from './type-rules.ts'
import { battleDefenses, battleMatchup, battleAdvantage } from './battle-engine.ts'
import type { PokemonType } from '../models/pokemon.ts'

export function battleWeaknesses(types: readonly PokemonType[]) {
  return battleDefenses(generationVRules, types).weaknesses
}

export function battleResistances(types: readonly PokemonType[]) {
  return battleDefenses(generationVRules, types).resistances
}

export function battleTypeMatchup(ownTypes: readonly PokemonType[], enemyTypes: readonly PokemonType[]) {
  return battleMatchup(generationVRules, ownTypes, enemyTypes)
}

export function battleTypeAdvantage(ownTypes: readonly PokemonType[], enemyTypes: readonly PokemonType[]) {
  return battleAdvantage(generationVRules, ownTypes, enemyTypes)
}
