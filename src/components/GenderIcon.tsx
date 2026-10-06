import { useEffect, useState } from 'react'
import { getSpeciesGender } from '../api/gender'
import type { SpeciesGender } from '../domain/gender'
import './GenderIcon.css'

export function GenderIcon({ speciesId }: { speciesId: number }) {
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
  const label = gender?.label ?? (loaded ? 'Sexo de la especie sin confirmar. Pulsa para reintentar.' : 'Consultando los sexos posibles de la especie…')
  return <button type="button" className={`gender-icon gender-${gender?.kind ?? 'unknown'}`} aria-label={label} title={label} onClick={() => { if (!gender) setAttempt(value => value + 1) }}>
    <span aria-hidden="true">{gender?.icon ?? (loaded ? '?' : '…')}</span>
    <span className="gender-tooltip" role="tooltip">{label}</span>
  </button>
}
