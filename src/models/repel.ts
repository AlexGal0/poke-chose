export interface RepelReading {
  steps: number
  updatedAt: string
}

export function isRepelReading(value: unknown): value is RepelReading {
  if (!value || typeof value !== 'object') return false
  const reading = value as RepelReading
  return Number.isInteger(reading.steps) && reading.steps >= 0 && reading.steps <= 250 &&
    typeof reading.updatedAt === 'string' && Number.isFinite(Date.parse(reading.updatedAt))
}
