import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { getExperienceLevels } from '../api/experience'
import { levelFromExperience } from '../domain/experience'
import type { StatsPokemon } from './stats-context'
import './CollectionDetails.css'

export function CollectionDetails({ pokemon }: { pokemon: StatsPokemon }) {
  const { t } = useTranslation()
  const [resolved, setResolved] = useState<{ species: number; experience: number; level: number | null } | null>(null)
  const species = pokemon.speciesId
  const experience = pokemon.experience
  useEffect(() => {
    if (pokemon.isEgg || pokemon.level != null || species == null || experience == null) return
    let active = true
    void getExperienceLevels(species).then(levels => {
      if (active) setResolved({ species, experience, level: levelFromExperience(experience, levels) })
    }).catch(() => { /* Keep unavailable rather than display an estimated level. */ })
    return () => { active = false }
  }, [species, experience, pokemon.isEgg, pokemon.level])
  const level = pokemon.level ?? (resolved && resolved.species === species && resolved.experience === experience ? resolved.level : null)
  if (pokemon.isEgg) return null
  return <div className="collection-details">
    <span>{level == null ? t('saveCollection.levelUnavailable') : t('saveCollection.memberLevel', { level })}</span>
  </div>
}
