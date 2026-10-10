import { useTranslation } from 'react-i18next'
import type { StatsPokemon } from './stats-context'
import { individualGenderLabel } from '../i18n/gender'
import './IndividualGenderIcon.css'

export function IndividualGenderIcon({ pokemon }: { pokemon: StatsPokemon }) {
  const { t } = useTranslation()
  if (pokemon.isEgg) return null
  const gender = pokemon.gender
  const label = individualGenderLabel(t, gender)
  return <span className={`individual-gender-icon gender-${gender ?? 'unknown'}`} role="img" aria-label={label} title={label} tabIndex={0}>
    {gender === 'male' ? '♂' : gender === 'female' ? '♀' : gender === 'genderless' ? '⚲' : '?'}
  </span>
}
