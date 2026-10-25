import type { RosterIndividual } from './saved-roster'
import type { KnowledgeService } from './knowledge'
import { createContext } from 'react'
import type { ManualPokemon } from './catalog'
import type { GameProfile } from '../profiles'

export const KNOWLEDGE_ACTIONS = [['stats', 'statistics'], ['moves', 'moves'], ['evolution', 'evolutions']] as const
export type KnowledgeView = typeof KNOWLEDGE_ACTIONS[number][0]
export const KnowledgeContext = createContext<{
  open: (pokemon: ManualPokemon, view: KnowledgeView, individual?: RosterIndividual) => void
  service: KnowledgeService
  modules: GameProfile['modules']
} | null>(null)
