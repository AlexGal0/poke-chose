import { isKnownSeason } from '../domain/encounter-seasons.ts'
import type { EncounterArea, EncounterZone, NamedEncounterResource } from '../games/core/encounters.ts'

type T = (key: string, params?: Record<string, unknown>) => string
export function encounterResourceLabel(resource: NamedEncounterResource, locale: string, t?: T) {
  if (resource.labelKey && t) return t(resource.labelKey)
  const fallback = resource.names[locale as 'es' | 'en'] ?? resource.names.en ?? resource.name
  return t ? t(`encounterAtlas.names.${resource.name}`, { defaultValue: fallback }) : fallback
}
export function encounterAreaLabel(t: T, area: EncounterArea, zone: EncounterZone, locale: string) {
  if (area.labelIsComplete) return encounterResourceLabel(area, locale, t)
  if (area.name.endsWith('-trades')) return t('encounterAtlas.npcTrades')
  if (area.name === `${zone.name}-area`) return encounterResourceLabel(zone, locale, t)
  if (zone.areas.length === 1) return encounterResourceLabel(zone, locale, t)
  const unknown = area.name.match(/unknown-area-(\d+)$/)
  if (unknown) return t('encounterAtlas.unconfirmedArea', { number: unknown[1] })
  if (area.name.startsWith('friend-safari-')) return t(`types.${area.name.slice('friend-safari-'.length)}`)
  return t(`encounterAtlas.areas.${area.name}`, { defaultValue: encounterResourceLabel(area, locale) })
}
export function atlasConditionLabel(t: T, condition: string) {
  if (isKnownSeason(condition)) return t(`encounterSeasons.list.${condition}`)
  return t(`encounterAtlas.conditions.${condition}`, { defaultValue: condition.replaceAll('-', ' ') })
}
