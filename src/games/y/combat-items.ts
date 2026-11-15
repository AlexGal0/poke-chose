import { getCombatItem } from '../../api/items.ts'

export async function getYCombatItem(index: number, locale: string, signal?: AbortSignal) {
  const data = (await import('../x/roster-data.ts')).publicRosterData
  const id = (data.itemIndices as Record<string, number>)[index]
  if (!id) throw new Error('Unknown Y item')
  return getCombatItem(id, locale, signal)
}
