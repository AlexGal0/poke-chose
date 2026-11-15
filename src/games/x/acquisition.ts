import { createXYAcquisitionService } from '../xy/acquisition.ts'
import { xEncounters } from './encounters.ts'
import { xKnowledge } from './knowledge.ts'
import { yEncounters } from '../y/encounters.ts'

export function createXAcquisitionService(data = xEncounters, knowledge = xKnowledge, loadMetadata?: Parameters<typeof createXYAcquisitionService>[3]) {
  return createXYAcquisitionService('x', data, knowledge, loadMetadata, yEncounters)
}
export const xAcquisition = createXAcquisitionService()
