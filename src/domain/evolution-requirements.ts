import type { EvolutionDetail, EvolutionNode } from '../models/evolution.ts'

export interface PendingEvolution { source: EvolutionNode; target: EvolutionNode; method: EvolutionDetail; group: 'trade' | 'item' }
export function pendingEvolutions(roots: readonly EvolutionNode[], owned: ReadonlySet<number>, caught: ReadonlySet<number>): PendingEvolution[] {
  const result = new Map<string, PendingEvolution>()
  function visit(source: EvolutionNode) {
    for (const target of source.children) {
      if (owned.has(source.speciesId) && !caught.has(target.speciesId)) {
        for (const method of target.methods) {
          const group = method.trigger.name === 'trade' ? 'trade' : method.item || method.held_item ? 'item' : null
          if (group) result.set(`${source.speciesId}-${target.speciesId}-${JSON.stringify(method)}`, { source, target, method, group })
        }
      }
      visit(target)
    }
  }
  roots.forEach(visit)
  return [...result.values()].sort((a, b) => a.target.speciesId - b.target.speciesId)
}

export function requiredEvolutionItems(rows: readonly PendingEvolution[]) {
  const targets = new Map<string, Set<number>>()
  for (const row of rows) {
    const item = row.method.item ?? row.method.held_item
    if (!item) continue
    const ids = targets.get(item.name) ?? new Set<number>()
    ids.add(row.target.speciesId)
    targets.set(item.name, ids)
  }
  return new Map([...targets].map(([name, ids]) => [name, ids.size]))
}
