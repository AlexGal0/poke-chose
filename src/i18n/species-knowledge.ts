import type { KnowledgeFact } from '../domain/species-knowledge.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function knowledgeVersionLabel(t: T, versionGroup: string): string {
  return t(`moves.versionGroup.${versionGroup}`, { defaultValue: versionGroup })
}

export function knowledgeFactLabel(t: T, facts: KnowledgeFact[]): string {
  return facts.map(fact => t(`speciesKnowledge.conditions.${fact.id}`, fact.params)).join(' · ')
}
