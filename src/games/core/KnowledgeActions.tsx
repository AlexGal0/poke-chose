import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { KnowledgeContext, KNOWLEDGE_ACTIONS } from './knowledge-context'
import type { KnowledgeView } from './knowledge-context'
import type { RosterIndividual } from './saved-roster'
import type { ManualPokemon } from './catalog'
import { pokemonDisplayName } from '../../domain/pokemon-names'
import './KnowledgeActions.css'

export function ActionIcon({ kind }: { kind: KnowledgeView | 'details' | 'external' }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind === 'stats' ? <><path d="M4 20V10m8 10V4m8 16v-7M2 20h20" /></>
      : kind === 'moves' ? <><path d="m5 3 14 14-2 2L3 5V3h2Zm14 0-5 5m-4 6-5 5m-2-4 6 6m6-18h6v6M15 21l6-6" /></>
        : kind === 'evolution' ? <><circle cx="4" cy="12" r="2" /><path d="M6 12h5m0-6v12m0-12h6m-6 12h6" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" /></>
          : kind === 'external' ? <><path d="M14 3h7v7m0-7L10 14M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></>
            : <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>}
  </svg>
}

export function KnowledgeActions({ pokemon, individual }: { pokemon: ManualPokemon; individual?: RosterIndividual }) {
  const { t } = useTranslation()
  const knowledge = useContext(KnowledgeContext)
  if (!knowledge) return null
  return <div className="knowledge-actions">
    {KNOWLEDGE_ACTIONS.filter(([, module]) => knowledge.modules[module]).map(([view]) => {
      const label = t(`speciesKnowledge.open.${view}`, { name: pokemonDisplayName(pokemon.name) })
      return <button type="button" key={view} aria-label={label} title={label} onClick={() => knowledge.open(pokemon, view, individual)}>
        <ActionIcon kind={view} /><span className="knowledge-action-label">{t(`speciesKnowledge.actions.${view}`)}</span>
      </button>
    })}
  </div>
}
