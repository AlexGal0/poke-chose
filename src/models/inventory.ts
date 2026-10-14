export interface InventoryItem { gameIndex: number; count: number }
export function isInventory(value: unknown): value is InventoryItem[] {
  return Array.isArray(value) && value.length <= 310 && new Set(value.map(item => item?.gameIndex)).size === value.length &&
    value.every(item => item && Number.isInteger(item.gameIndex) && item.gameIndex >= 1 && item.gameIndex <= 638 && Number.isInteger(item.count) && item.count >= 1 && item.count <= 999)
}
