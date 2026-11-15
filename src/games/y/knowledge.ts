import { createXYKnowledge } from '../xy/knowledge.ts'
import { yCatalogRules } from './catalog.ts'

export const yKnowledge = createXYKnowledge(yCatalogRules)
export const yKnowledgeRules = yKnowledge.rules
