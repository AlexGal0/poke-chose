import { useTranslation } from 'react-i18next'
import { genderLabel, individualGenderLabel } from '../../i18n/gender'
import type { IndividualGender, SpeciesGender } from '../../domain/gender'
import './GenderBadge.css'
import type { GenderDistribution } from '../../models/gender-distribution'
import { GenderDistributionText } from '../../components/GenderDistributionText'

function GenderSymbol({ kind }: { kind: IndividualGender }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx={kind === 'male' ? 9 : 12} cy={kind === 'male' ? 15 : 9} r="5" />
    {kind === 'male' ? <path d="m13 11 7-7m-6 0h6v6" /> : kind === 'female' ? <path d="M12 14v7m-4-3h8" /> : <path d="M12 14v7" />}
  </svg>
}
export function GenderBadge({ kind, species = false, distribution }: { kind?: IndividualGender | 'both'; species?: boolean; distribution?: GenderDistribution | null }) {
  const { t } = useTranslation()
  if (species && distribution) return <span className="gender-badge"><GenderDistributionText distribution={distribution} /></span>
  const label = species && kind ? genderLabel(t, kind as SpeciesGender['kind']) : individualGenderLabel(t, kind === 'both' ? undefined : kind)
  return <span className={`gender-badge gender-badge-${kind ?? 'unknown'}`} role="img" aria-label={label} title={label}>
    {kind === 'both' ? <><span className="gender-badge-male"><GenderSymbol kind="male" /></span><span className="gender-badge-female"><GenderSymbol kind="female" /></span></> : kind ? <GenderSymbol kind={kind} /> : <span aria-hidden="true">?</span>}
  </span>
}
