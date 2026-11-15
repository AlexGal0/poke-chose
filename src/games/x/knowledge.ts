import { createXYKnowledge } from '../xy/knowledge.ts'
import { xCatalogRules } from './catalog.ts'
export { xyEvolutionAppearance as xEvolutionAppearance } from '../xy/knowledge.ts'

export const xKnowledge = createXYKnowledge(xCatalogRules)
export const xKnowledgeRules = xKnowledge.rules
