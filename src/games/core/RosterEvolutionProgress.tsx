import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KnowledgeContext } from './knowledge-context'
import type { SavedRosterPokemon, SavedRosterService } from './saved-roster'
import type { KnowledgeNode } from '../../domain/species-knowledge'
import { evolutionLevelsRemaining } from '../../domain/evolution-progress'
import { EvolutionProgress } from '../../components/EvolutionProgress'
import './RosterEvolutionProgress.css'

export function RosterEvolutionProgress({ pokemon, service }: { pokemon: SavedRosterPokemon; service: SavedRosterService }) {
  const context = useContext(KnowledgeContext)
  const knowledge = context?.service
  const { i18n } = useTranslation()
  const [result, setResult] = useState<{ service: typeof knowledge; id: number; root: KnowledgeNode } | null>(null)
  const level = pokemon.level
  const speciesId = pokemon.id
  const speciesName = pokemon.name
  const enabled = !!knowledge && !!context?.modules.evolutions && level != null
  useEffect(() => {
    if (!knowledge || !enabled) return
    const controller = new AbortController()
    knowledge.evolution({ id: speciesId, name: speciesName }, i18n.language, controller.signal).then(family => {
      if (!controller.signal.aborted) setResult({ service: knowledge, id: speciesId, root: family.root })
    }).catch(() => { /* Missing data cannot provide a countdown. */ })
    return () => controller.abort()
  }, [knowledge, enabled, speciesId, speciesName, i18n.language])
  function find(node: KnowledgeNode): KnowledgeNode | undefined {
    return node.id === pokemon.id ? node : node.children.map(find).find(Boolean)
  }
  const node = result?.service === knowledge && result?.id === pokemon.id ? find(result.root) : undefined
  return <EvolutionProgress remaining={evolutionLevelsRemaining(node?.children.flatMap(child => child.methods) ?? [], level)} onClick={() => context?.open(pokemon, 'evolution', { pokemon, service })} />
}
