import { useContext, useEffect, useState } from 'react'
import { getEvolutionFamily, getEvolutionSpecies } from '../api/evolution'
import { findEvolutionNode } from '../domain/acquisition'
import { evolutionLevelsRemaining } from '../domain/evolution-progress'
import type { EvolutionDetail } from '../models/evolution'
import { EvolutionContext } from './evolution-context'
import { EvolutionProgress } from './EvolutionProgress'

export function BlackEvolutionProgress({ speciesId, level }: { speciesId: number; level: number | null | undefined }) {
  const open = useContext(EvolutionContext)
  const [result, setResult] = useState<{ id: number; methods: EvolutionDetail[] } | null>(null)
  const hasLevel = level != null
  useEffect(() => {
    if (!hasLevel) return
    const controller = new AbortController()
    getEvolutionSpecies(speciesId, controller.signal).then(species => getEvolutionFamily(species, controller.signal)).then(root => {
      if (!controller.signal.aborted) setResult({ id: speciesId, methods: findEvolutionNode(root, speciesId)?.children.flatMap(child => child.methods) ?? [] })
    }).catch(() => { /* Missing data cannot provide a countdown. */ })
    return () => controller.abort()
  }, [speciesId, hasLevel])
  return <EvolutionProgress remaining={result?.id === speciesId ? evolutionLevelsRemaining(result.methods, level) : null} onClick={() => open(speciesId)} />
}
