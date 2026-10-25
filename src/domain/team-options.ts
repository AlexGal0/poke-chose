import { typeCoverage, typeDefense, typeEffectiveness } from './type-analysis.ts'
import type { AnalysisPokemon, TypeRules } from './type-analysis.ts'

export function isAnalysisFainted(pokemon: AnalysisPokemon) {
  return !pokemon.isEgg && pokemon.currentHp === 0 && (pokemon.maxHp ?? 0) > 0
}

export function analysisMembers<T extends AnalysisPokemon>(team: readonly T[], includeFainted: boolean) {
  return team.filter(pokemon => !pokemon.isEgg && (includeFainted || !isAnalysisFainted(pokemon)))
}

export function collectionAlternatives<T extends AnalysisPokemon>(rules: TypeRules, team: readonly AnalysisPokemon[], collection: readonly T[], discovered: ReadonlySet<number>, includeFainted: boolean) {
  const members = analysisMembers(team, includeFainted)
  if (!members.length) return []
  const shared = typeDefense(rules, members).filter(row => row.weak >= 2)
  const uncovered = typeCoverage(rules, members.flatMap(pokemon => [...pokemon.types])).filter(row => !row.attackers.length)
  const inTeam = (pokemon: AnalysisPokemon) => team.some(member => member.instanceKey && pokemon.instanceKey
    ? member.instanceKey === pokemon.instanceKey : member.id === pokemon.id)
  return analysisMembers(collection, includeFainted)
    .filter(pokemon => discovered.has(pokemon.id) && !inTeam(pokemon))
    .map(pokemon => {
      const resists = shared.filter(row => typeEffectiveness(rules, row.type, pokemon.types) < 1).map(row => row.type)
      const coverage = uncovered.filter(row => pokemon.types.some(attack => typeEffectiveness(rules, attack, [row.type]) > 1)).map(row => row.type)
      return { pokemon, resists, coverage, score: resists.length * 2 + coverage.length }
    })
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || a.pokemon.id - b.pokemon.id || (a.pokemon.instanceKey ?? '').localeCompare(b.pokemon.instanceKey ?? ''))
}
