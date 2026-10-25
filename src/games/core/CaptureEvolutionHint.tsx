import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KnowledgeContext } from './knowledge-context'
import type { ManualPokemon } from './catalog'
import type { KnowledgeNode } from '../../domain/species-knowledge'
import { ownedKnowledgeAncestors } from './encounters'
import { pokemonDisplayName } from '../../domain/pokemon-names'
import { ActionIcon } from './KnowledgeActions'

export function CaptureEvolutionHint({ pokemon, owned }: { pokemon: ManualPokemon; owned: ReadonlySet<number> }) {
  const { t, i18n } = useTranslation()
  const context = useContext(KnowledgeContext)
  const service = context?.service
  const [result, setResult] = useState<{ id: number; root: KnowledgeNode } | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!service) return
    const controller = new AbortController()
    service.evolution(pokemon, i18n.language, controller.signal).then(family => {
      if (!controller.signal.aborted) { setResult({ id: pokemon.id, root: family.root }); setError(false) }
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [service, pokemon, i18n.language, attempt])
  if (!context || !service) return null
  if (error) return <button className="atlas-evolution-hint" onClick={() => { setError(false); setAttempt(value => value + 1) }} title={t('encounterAtlas.evolutionRetry')}>{t('encounterAtlas.evolutionRetry')}</button>
  const ancestors = result?.id === pokemon.id ? ownedKnowledgeAncestors(result.root, pokemon.id, owned) : []
  if (!ancestors.length) return null
  const label = t('ownedEvolutionIcon.label', { name: pokemonDisplayName(pokemon.name), ancestors: ancestors.map(node => pokemonDisplayName(node.name)).join(', ') })
  return <button className="atlas-evolution-hint" title={label} aria-label={label} onClick={() => context.open(pokemon, 'evolution')}><ActionIcon kind="evolution" /><span>{t('encounterAtlas.evolveOwned', { names: ancestors.map(node => pokemonDisplayName(node.name)).join(', ') })}</span></button>
}
