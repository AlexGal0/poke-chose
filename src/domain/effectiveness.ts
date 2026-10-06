import { TYPES } from '../models/pokemon.ts'
import type { Pokemon, PokemonType } from '../models/pokemon.ts'

// Generation V only. Steel still resists Ghost and Dark; Fairy does not exist.
const chart: Record<PokemonType, { strong: PokemonType[]; weak: PokemonType[]; immune: PokemonType[] }> = {
  normal: { strong: [], weak: ['rock', 'steel'], immune: ['ghost'] },
  fire: { strong: ['grass', 'ice', 'bug', 'steel'], weak: ['fire', 'water', 'rock', 'dragon'], immune: [] },
  water: { strong: ['fire', 'ground', 'rock'], weak: ['water', 'grass', 'dragon'], immune: [] },
  electric: { strong: ['water', 'flying'], weak: ['electric', 'grass', 'dragon'], immune: ['ground'] },
  grass: { strong: ['water', 'ground', 'rock'], weak: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], immune: [] },
  ice: { strong: ['grass', 'ground', 'flying', 'dragon'], weak: ['fire', 'water', 'ice', 'steel'], immune: [] },
  fighting: { strong: ['normal', 'ice', 'rock', 'dark', 'steel'], weak: ['poison', 'flying', 'psychic', 'bug'], immune: ['ghost'] },
  poison: { strong: ['grass'], weak: ['poison', 'ground', 'rock', 'ghost'], immune: ['steel'] },
  ground: { strong: ['fire', 'electric', 'poison', 'rock', 'steel'], weak: ['grass', 'bug'], immune: ['flying'] },
  flying: { strong: ['grass', 'fighting', 'bug'], weak: ['electric', 'rock', 'steel'], immune: [] },
  psychic: { strong: ['fighting', 'poison'], weak: ['psychic', 'steel'], immune: ['dark'] },
  bug: { strong: ['grass', 'psychic', 'dark'], weak: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel'], immune: [] },
  rock: { strong: ['fire', 'ice', 'flying', 'bug'], weak: ['fighting', 'ground', 'steel'], immune: [] },
  ghost: { strong: ['psychic', 'ghost'], weak: ['dark', 'steel'], immune: ['normal'] },
  dragon: { strong: ['dragon'], weak: ['steel'], immune: [] },
  dark: { strong: ['psychic', 'ghost'], weak: ['fighting', 'dark', 'steel'], immune: [] },
  steel: { strong: ['ice', 'rock'], weak: ['fire', 'water', 'electric', 'steel'], immune: [] },
}

export function effectiveness(attack: PokemonType, defenders: readonly PokemonType[]): number {
  const row = chart[attack]
  return defenders.reduce((damage, type) => damage * (
    row.immune.includes(type) ? 0 : row.strong.includes(type) ? 2 : row.weak.includes(type) ? 0.5 : 1
  ), 1)
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
