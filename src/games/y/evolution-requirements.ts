import { createXYEvolutionRequirements } from '../xy/evolution-requirements.ts'
import { yCatalogRules } from './catalog.ts'
import { yKnowledge } from './knowledge.ts'

export const yEvolutionRequirements = createXYEvolutionRequirements(yCatalogRules, yKnowledge)
