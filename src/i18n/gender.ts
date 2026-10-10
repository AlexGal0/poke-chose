import type { IndividualGender, SpeciesGender } from '../domain/gender.ts'

type T = (key: string) => string

export function individualGenderLabel(t: T, gender?: IndividualGender): string {
  return t(`individualGender.${gender ?? 'unknown'}`)
}

export function genderLabel(t: T, kind: SpeciesGender['kind']): string {
  return t(`gender.${kind}`)
}
