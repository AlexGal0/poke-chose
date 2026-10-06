import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getEvolutionFamily, getEvolutionSpecies } from '../api/evolution'
import { ownedPreevolutions } from '../domain/evolution'
import { pokemonDisplayName } from '../domain/pokemon-names'
import type { EvolutionNode } from '../models/evolution'
import { EvolutionContext } from './evolution-context'
import './OwnedEvolutionIcon.css'

export function OwnedEvolutionIcon({ speciesId, name, ownedSpeciesIds }: { speciesId: number; name: string; ownedSpeciesIds: ReadonlySet<number> }) {
  const { t } = useTranslation()
  const open = useContext(EvolutionContext)
  const [family, setFamily] = useState<{ speciesId: number; root: EvolutionNode } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getEvolutionSpecies(speciesId, controller.signal)
      .then(species => getEvolutionFamily(species, controller.signal))
      .then(root => { if (!controller.signal.aborted) setFamily({ speciesId, root }) })
      .catch(() => { /* This optional hint must not interrupt the capture checklist. */ })
    return () => controller.abort()
  }, [speciesId])
  const ancestors = family?.speciesId === speciesId ? ownedPreevolutions(family.root, speciesId, ownedSpeciesIds) : []
  if (!ancestors.length) return null
  const label = t('ownedEvolutionIcon.label', { name: pokemonDisplayName(name), ancestors: ancestors.map(node => pokemonDisplayName(node.name)).join(', ') })
  return <button type="button" className="owned-evolution-icon" title={label} aria-label={label} onClick={() => open(speciesId)}>
    <span aria-hidden="true">🧬</span>
    <span className="owned-evolution-tooltip" role="tooltip">{label}</span>
  </button>
}
