import type { IndividualGender, SpeciesGender } from '../domain/gender.ts'
import type { GenderDistribution } from '../models/gender-distribution.ts'

type T = (key: string) => string

export function individualGenderLabel(t: T, gender?: IndividualGender): string {
  return t(`individualGender.${gender ?? 'unknown'}`)
}

export function genderLabel(t: T, kind: SpeciesGender['kind']): string {
  return t(`gender.${kind}`)
}

export function genderPercentage(percent: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(percent / 100)
}

export function genderDistributionLabel(t: (key: string, options?: Record<string, unknown>) => string, distribution: GenderDistribution, locale: string) {
  if (distribution.male === 0) return genderLabel(t, 'female')
  if (distribution.female === 0) return genderLabel(t, 'male')
  return t('genderRatio.summary', { male: genderPercentage(distribution.male, locale), female: genderPercentage(distribution.female, locale) })
}
