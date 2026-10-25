import { useTranslation } from 'react-i18next'
import type { StatsPokemon } from './stats-context'
import { individualGenderLabel } from '../i18n/gender'
import './IndividualGenderIcon.css'
import { GenderSymbol } from './GenderSymbol'

export function IndividualGenderIcon({ pokemon }: { pokemon: StatsPokemon }) {
  const { t } = useTranslation()
  if (pokemon.isEgg) return null
  const gender = pokemon.gender
  const label = individualGenderLabel(t, gender)
  return <span className={`individual-gender-icon gender-${gender ?? 'unknown'}`} role="img" aria-label={label} title={label} tabIndex={0}>
    <GenderSymbol kind={gender} />
  </span>
}
