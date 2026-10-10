import type { EvolutionNode } from '../models/evolution.ts'

export function daycareEvolutionAlert(level: number, target: number, stepsRemaining: number | null): 'soon' | 'reached' | null {
  if (level >= target) return 'reached'
  return level + 1 === target && stepsRemaining != null && stepsRemaining > 0 && stepsRemaining <= 50 ? 'soon' : null
}

export function nextEvolutionLevel(root: EvolutionNode, speciesId: number): number | null {
  const find = (node: EvolutionNode): EvolutionNode | undefined => node.speciesId === speciesId ? node : node.children.map(find).find(Boolean)
  const current = find(root)
  const levels = current?.children.flatMap(child => child.methods.flatMap(method =>
    method.trigger.name === 'level-up' && Number.isInteger(method.min_level) && method.min_level! >= 1 && method.min_level! <= 100 &&
    !method.gender && !method.min_happiness && !method.min_beauty && !method.held_item && !method.known_move && !method.location &&
    !method.party_species && !method.time_of_day && method.relative_physical_stats == null && !method.near_special_rock && !method.condition_expression
      ? [method.min_level!] : [])) ?? []
  return levels.length ? Math.min(...levels) : null
}
