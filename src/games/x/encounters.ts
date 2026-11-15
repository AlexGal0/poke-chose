import snapshot from './data/encounters.json' with { type: 'json' }
import { createXYEncounters } from '../xy/encounters.ts'
export { xyRouteOrder as xRouteOrder } from '../xy/encounters.ts'

export const xEncounters = createXYEncounters(snapshot)
