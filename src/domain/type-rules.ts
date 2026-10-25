import { TYPES } from '../models/pokemon.ts'
import type { TypeMatchup, TypeRules } from './type-analysis.ts'

const chart: Record<string, TypeMatchup> = {
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

export const generationVRules: TypeRules = { generation: 5, types: TYPES, chart }

// Explicit data changes, rather than generation conditions in calculations or UI.
export const generationVIRules: TypeRules = {
  generation: 6,
  types: [...TYPES, 'fairy'],
  chart: {
    ...chart,
    fighting: { ...chart.fighting, weak: [...chart.fighting.weak, 'fairy'] },
    poison: { ...chart.poison, strong: [...chart.poison.strong, 'fairy'] },
    bug: { ...chart.bug, weak: [...chart.bug.weak, 'fairy'] },
    ghost: { ...chart.ghost, weak: ['dark'] },
    dragon: { ...chart.dragon, immune: ['fairy'] },
    dark: { ...chart.dark, weak: ['fighting', 'dark', 'fairy'] },
    steel: { ...chart.steel, strong: [...chart.steel.strong, 'fairy'] },
    fairy: { strong: ['fighting', 'dragon', 'dark'], weak: ['fire', 'poison', 'steel'], immune: [] },
  },
}
