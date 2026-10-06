import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSpeciesGender } from '../api/gender'
import type { SpeciesGender } from '../domain/gender'
import { genderLabel } from '../i18n/gender.ts'
import './GenderIcon.css'

export function GenderIcon({ speciesId }: { speciesId: number }) {
  const { t } = useTranslation()
  const [result, setResult] = useState<{ id: number; gender: SpeciesGender | null } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    getSpeciesGender(speciesId).then(gender => {
      if (active) setResult({ id: speciesId, gender })
    }).catch(() => {
      if (active) setResult({ id: speciesId, gender: null })
    })
    return () => { active = false }
  }, [speciesId, attempt])
  const loaded = result?.id === speciesId
  const gender = loaded ? result.gender : null
  const label = gender ? genderLabel(t, gender.kind) : loaded ? t('genderIcon.unconfirmed') : t('genderIcon.loading')
  return <button type="button" className={`gender-icon gender-${gender?.kind ?? 'unknown'}`} aria-label={label} title={label} onClick={() => { if (!gender) setAttempt(value => value + 1) }}>
    <span aria-hidden="true">{gender?.icon ?? (loaded ? '?' : '…')}</span>
    <span className="gender-tooltip" role="tooltip">{label}</span>
  </button>
}
