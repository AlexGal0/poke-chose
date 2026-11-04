import snapshot from './data/encounters.json' with { type: 'json' }
import { createXYEncounters } from '../xy/encounters.ts'

export const yEncounters = createXYEncounters(snapshot)
