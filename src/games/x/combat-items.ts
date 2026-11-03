import { getCombatItem } from '../../api/items.ts'

export async function getXCombatItem(index: number, locale: string, signal?: AbortSignal) {
  const data = (await import('./roster-data.ts')).publicRosterData
  const id = (data.itemIndices as Record<string, number>)[index]
  if (!id) throw new Error('Unknown X item')
  return getCombatItem(id, locale, signal)
}
