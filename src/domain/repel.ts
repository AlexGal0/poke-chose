import type { RepelReading } from '../models/repel.ts'

export function repelReadingStale(reading: RepelReading, unavailable: boolean, now: number): boolean {
  return unavailable || now - Date.parse(reading.updatedAt) > 10000
}
