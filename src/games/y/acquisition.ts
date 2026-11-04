import { createXYAcquisitionService } from '../xy/acquisition.ts'
import { yEncounters } from './encounters.ts'
import { yKnowledge } from './knowledge.ts'

export function createYAcquisitionService(data = yEncounters, knowledge = yKnowledge, loadMetadata?: Parameters<typeof createXYAcquisitionService>[3]) {
  return createXYAcquisitionService('y', data, knowledge, loadMetadata)
}
export const yAcquisition = createYAcquisitionService()
