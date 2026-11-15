// Fill complete rows without dropping below the original twelve species.
export function catalogPageSize(columns: number): number {
  const count = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1
  return Math.ceil(12 / count) * count
}
