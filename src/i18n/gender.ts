import type { SpeciesGender } from '../domain/gender.ts'

type T = (key: string) => string

export function genderLabel(t: T, kind: SpeciesGender['kind']): string {
  return t(`gender.${kind}`)
}
