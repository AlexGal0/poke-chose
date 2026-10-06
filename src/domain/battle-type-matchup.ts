import { effectiveness } from './effectiveness.ts'
import type { PokemonType } from '../models/pokemon.ts'
import { TYPES } from '../models/pokemon.ts'

export function battleWeaknesses(types: readonly PokemonType[]) {
  return TYPES.map(type => ({ type, multiplier: effectiveness(type, types) })).filter(row => row.multiplier > 1)
}

export function battleResistances(types: readonly PokemonType[]) {
  return TYPES.map(type => ({ type, multiplier: effectiveness(type, types) })).filter(row => row.multiplier < 1)
}

export function battleTypeMatchup(ownTypes: readonly PokemonType[], enemyTypes: readonly PokemonType[]) {
  return {
    outgoing: ownTypes.map(type => ({ type, multiplier: effectiveness(type, enemyTypes) })),
    incoming: enemyTypes.map(type => ({ type, multiplier: effectiveness(type, ownTypes) })),
  }
}

export function battleTypeAdvantage(ownTypes: readonly PokemonType[], enemyTypes: readonly PokemonType[]) {
  const matchup = battleTypeMatchup(ownTypes, enemyTypes)
  const outgoing = Math.max(...matchup.outgoing.map(row => row.multiplier))
  const incoming = Math.max(...matchup.incoming.map(row => row.multiplier))
  const status = outgoing > 1 && incoming > 1 ? 'mutual' : outgoing > incoming ? 'advantage' : outgoing < incoming ? 'disadvantage' : 'neutral'
  return { status, outgoing, incoming }
}
