import { typeEffectiveness } from './type-analysis.ts'
import type { TypeRules } from './type-analysis.ts'

function checkTypes(rules: TypeRules, types: readonly string[]) {
  if (types.length < 1 || types.length > 2 || new Set(types).size !== types.length || types.some(type => !rules.types.includes(type))) throw new Error('Invalid battle types')
}

export function battleDefenses(rules: TypeRules, types: readonly string[]) {
  checkTypes(rules, types)
  const rows = rules.types.map(type => ({ type, multiplier: typeEffectiveness(rules, type, types) }))
  return { weaknesses: rows.filter(row => row.multiplier > 1), resistances: rows.filter(row => row.multiplier < 1) }
}

export function battleMatchup(rules: TypeRules, ownTypes: readonly string[], enemyTypes: readonly string[]) {
  checkTypes(rules, ownTypes)
  checkTypes(rules, enemyTypes)
  return {
    outgoing: ownTypes.map(type => ({ type, multiplier: typeEffectiveness(rules, type, enemyTypes) })),
    incoming: enemyTypes.map(type => ({ type, multiplier: typeEffectiveness(rules, type, ownTypes) })),
  }
}

export function battleAdvantage(rules: TypeRules, ownTypes: readonly string[], enemyTypes: readonly string[]) {
  const matchup = battleMatchup(rules, ownTypes, enemyTypes)
  const outgoing = Math.max(...matchup.outgoing.map(row => row.multiplier))
  const incoming = Math.max(...matchup.incoming.map(row => row.multiplier))
  const status = outgoing > 1 && incoming > 1 ? 'mutual' : outgoing > incoming ? 'advantage' : outgoing < incoming ? 'disadvantage' : 'neutral'
  return { status, outgoing, incoming }
}
