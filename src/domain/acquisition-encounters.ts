type Encounter = {
  area: string
  method: { name: string }
  min_level: number
  max_level: number
  chance: number
  condition_values: { name: string }[]
}

export function summarizeAcquisitionEncounters(rows: readonly Encounter[]): Encounter[] {
  const groups = new Map<string, Encounter>()
  for (const row of rows) {
    const key = JSON.stringify([row.area, row.method.name, row.condition_values.map(condition => condition.name).sort()])
    const group = groups.get(key)
    if (group) {
      group.min_level = Math.min(group.min_level, row.min_level)
      group.max_level = Math.max(group.max_level, row.max_level)
      group.chance = Math.min(100, group.chance + row.chance)
    } else groups.set(key, { ...row })
  }
  return [...groups.values()]
}
