import { getBlackEncounters, getBlackLocations } from './encounters.ts'
import type { ZoneEncounters } from '../domain/encounter-opportunities.ts'

let pending: Promise<ZoneEncounters[]> | undefined
export function getBlackEncounterIndex(): Promise<ZoneEncounters[]> {
  if (pending) return pending
  pending = (async () => {
    const locations = await getBlackLocations()
    const result: ZoneEncounters[] = new Array(locations.length)
    let next = 0
    const workers = await Promise.allSettled(Array.from({ length: Math.min(4, locations.length) }, async () => {
      while (next < locations.length) {
        const index = next++
        const location = locations[index]
        result[index] = { location, rows: await getBlackEncounters(location.id) }
      }
    }))
    const failure = workers.find(worker => worker.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
    return result
  })().catch(error => { pending = undefined; throw error })
  return pending
}
