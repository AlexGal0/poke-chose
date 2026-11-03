import { SpeciesScopeBadge } from './SpeciesScopeBadge'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { EvolutionRequirements } from '../../components/EvolutionRequirements'
import { KnowledgeContext } from './knowledge-context'
import type { ManualPokemon } from './catalog'
import type { PokedexState } from '../../models/pokedex'
import type { EvolutionInventory, EvolutionRequirementsService } from './evolution-requirements'

const unknownInventory: EvolutionInventory = { quantities: null, stale: false }
export function WorkspaceEvolutionRequirements({ collection, caught, manual, stale, service, inventory = unknownInventory }: {
  collection: readonly ManualPokemon[] | null; caught: PokedexState | null; manual: boolean; stale: boolean; service: EvolutionRequirementsService; inventory?: EvolutionInventory
}) {
  const knowledge = useContext(KnowledgeContext)
  const { t } = useTranslation()
  if (!collection) return <p role="status" className="empty">{t('sourceCapabilities.collectionWaiting')}</p>
  return <EvolutionRequirements collection={collection} caught={caught} manual={manual} stale={stale} service={service} inventory={inventory} renderScopeBadge={id => <SpeciesScopeBadge scope={service.scopeInfo?.(id)} />} openEvolution={id => {
    const pokemon = collection.find(row => row.id === id)
    if (pokemon) knowledge?.open(pokemon, 'evolution')
  }} />
}
