import { BreedingOnlyBadge } from '../../components/BreedingOnlyBadge'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { DiscoveryContext } from '../../components/discovery-context'
import { TypeBadge } from '../../components/TypeBadge'
import { knowledgeEvolutionFacts } from '../../domain/species-knowledge'
import type { KnowledgeNode } from '../../domain/species-knowledge'
import { knowledgeFactLabel } from '../../i18n/species-knowledge'
import { pokemonDisplayName } from '../../domain/pokemon-names'
import type { ManualPokemon } from './catalog'
import './EvolutionFamily.css'

export function EvolutionFamily({ node, selectedId, labels, pokemon = {}, stage = 1 }: {
  node: KnowledgeNode; selectedId: number; labels: Record<string, string>; pokemon?: Record<number, ManualPokemon>; stage?: number
}) {
  const { t } = useTranslation()
  const discovered = useContext(DiscoveryContext).has(node.id)
  const appearance = pokemon[node.id]
  const methods = [...new Set(node.methods.map(method => knowledgeFactLabel(t, knowledgeEvolutionFacts(method, node.id, labels))))]
  return <li className="family-branch">
    {methods.length > 0 && <div className="family-transition">
      <span className="family-arrow" aria-hidden="true">→</span>
      <div className="family-requirements"><span className="family-condition-label">{t('speciesKnowledge.requirements')}</span>
        {methods.map((method, index) => <div key={method}>{index > 0 && <span className="family-or">{t('evolutionDialog.orBranch')}</span>}<p>{method}</p></div>)}
      </div>
    </div>}
    <article className={`family-card${node.id === selectedId ? ' family-card-selected' : ''}`} aria-label={pokemonDisplayName(node.name)}>
      <div className="family-card-top"><span>{t('speciesKnowledge.stage', { number: stage })}</span><span>#{String(node.id).padStart(3, '0')}</span></div>
      <div className="family-artwork">{discovered && appearance?.sprite ? <img src={appearance.sprite} alt="" width="104" height="104" /> : <span className="family-undiscovered" aria-label={t('pokemonCard.notDiscovered')}>?</span>}</div>
      <h3>{pokemonDisplayName(node.name)} {node.children.length > 0 && <BreedingOnlyBadge speciesId={node.id} />}</h3>
      <div className="family-types">{appearance?.types.map(type => <TypeBadge key={type} type={type} />)}</div>
      {node.id === selectedId && <span className="family-current">{t('evolutionDialog.queriedSpecies')}</span>}
    </article>
    {node.children.length > 0 && <ul className="family-children">{node.children.map(child => <EvolutionFamily key={child.id} node={child} selectedId={selectedId} labels={labels} pokemon={pokemon} stage={stage + 1} />)}</ul>}
  </li>
}
