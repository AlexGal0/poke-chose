export interface TypeMatchup {
  strong: readonly string[]
  weak: readonly string[]
  immune: readonly string[]
}
export interface TypeRules {
  generation: number
  types: readonly string[]
  chart: Readonly<Record<string, TypeMatchup>>
}
export interface AnalysisPokemon {
  id: number
  name: string
  types: readonly string[]
  sprite: string | null
  instanceKey?: string
  nickname?: string | null
  isEgg?: boolean
  currentHp?: number
  maxHp?: number
  location?: 'party' | 'box'
  box?: number | null
  slot?: number
}

export function typeEffectiveness(rules: TypeRules, attack: string, defenders: readonly string[]): number {
  if (!rules.types.includes(attack) || defenders.some(type => !rules.types.includes(type))) {
    throw new Error('Unsupported type for ruleset')
  }
  const row = rules.chart[attack]
  return defenders.reduce((damage, type) => damage * (
    row.immune.includes(type) ? 0 : row.strong.includes(type) ? 2 : row.weak.includes(type) ? 0.5 : 1
  ), 1)
}

export function typeDefense<T extends AnalysisPokemon>(rules: TypeRules, team: readonly T[]) {
  return rules.types.map(type => {
    const members = team.map(pokemon => ({ pokemon, multiplier: typeEffectiveness(rules, type, pokemon.types) }))
    return {
      type, members,
      weak: members.filter(member => member.multiplier > 1).length,
      neutral: members.filter(member => member.multiplier === 1).length,
      resistant: members.filter(member => member.multiplier > 0 && member.multiplier < 1).length,
      immune: members.filter(member => member.multiplier === 0).length,
    }
  })
}

export function typeCoverage(rules: TypeRules, attackTypes: readonly string[]) {
  const unique = [...new Set(attackTypes)]
  return rules.types.map(type => ({ type, attackers: unique.filter(attack => typeEffectiveness(rules, attack, [type]) > 1) }))
}
