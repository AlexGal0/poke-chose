import { createXYEvolutionRequirements } from '../xy/evolution-requirements.ts'
import { xCatalogRules } from './catalog.ts'
import { xKnowledge } from './knowledge.ts'
export { requirementTree } from '../xy/evolution-requirements.ts'

export const xEvolutionRequirements = createXYEvolutionRequirements(xCatalogRules, xKnowledge)
