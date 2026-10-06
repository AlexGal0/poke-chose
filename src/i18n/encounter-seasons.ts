import { isKnownSeason } from '../domain/encounter-seasons.ts'

type T = (key: string) => string

export function encounterConditionLabel(t: T, condition: string): string {
  return isKnownSeason(condition) ? t(`encounterSeasons.list.${condition}`) : condition
}
