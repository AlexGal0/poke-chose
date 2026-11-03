import type { EvolutionInventory } from '../core/evolution-requirements.ts'
import type { InventoryReading } from '../core/inventory.ts'

export function xEvolutionInventory(reading: InventoryReading | null | undefined, stale: boolean): EvolutionInventory {
  if (!reading) return { quantities: null, stale: true }
  const quantities: Record<string, { bag: number; held: number }> = {}
  for (const item of reading.bag) quantities[item.gameIndex] = { bag: item.count, held: 0 }
  for (const item of reading.held) quantities[item.gameIndex] = { bag: quantities[item.gameIndex]?.bag ?? 0, held: item.count }
  return { quantities, stale }
}
