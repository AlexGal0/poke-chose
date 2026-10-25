import { useTranslation } from 'react-i18next'
import type { GenderDistribution } from '../models/gender-distribution'
import { genderDistributionLabel, genderPercentage } from '../i18n/gender'
import './GenderDistributionText.css'

export function GenderDistributionText({ distribution }: { distribution: GenderDistribution }) {
  const { t, i18n } = useTranslation()
  return <span className="gender-distribution" role="img" aria-label={genderDistributionLabel(t, distribution, i18n.language)} title={genderDistributionLabel(t, distribution, i18n.language)}>
    <span className="gender-distribution-labels" aria-hidden="true">
      {distribution.male > 0 && <span className="gender-distribution-male">♂ {genderPercentage(distribution.male, i18n.language)}</span>}
      {distribution.female > 0 && <span className="gender-distribution-female">♀ {genderPercentage(distribution.female, i18n.language)}</span>}
    </span>
    <span className="gender-distribution-bar" aria-hidden="true">
      {distribution.male > 0 && <span className="gender-distribution-segment gender-distribution-segment-male" style={{ width: `${distribution.male}%` }} />}
      {distribution.female > 0 && <span className="gender-distribution-segment gender-distribution-segment-female" style={{ width: `${distribution.female}%` }} />}
    </span>
  </span>
}
