import type { EncounterLocation } from '../models/encounters.ts'
import { areaDescriptor, zoneSlug } from '../domain/black-zones.ts'
import type { ZoneStage } from '../domain/black-zones.ts'

type T = (key: string, params?: Record<string, unknown>) => string

export function zoneLabel(t: T, location: EncounterLocation): string {
  const slug = zoneSlug(location)
  return slug ? t(`zones.list.${slug}`) : t('zones.noNameVerified')
}

export function stageLabel(t: T, stage: ZoneStage): string {
  return t(`zones.stage.${stage}`)
}

export function areaLabel(t: T, slug: string): string {
  const descriptor = areaDescriptor(slug)
  if (descriptor.kind === 'unknown') return t('zones.area.unknown', { raw: descriptor.raw })
  const zone = t(`zones.list.${descriptor.zoneSlug}`)
  switch (descriptor.kind) {
    case 'main': return t('zones.area.main', { zone })
    case 'entrance': return t('zones.area.entrance', { zone })
    case 'basement': return t('zones.area.basement', { zone, level: descriptor.level })
    case 'floor': return t('zones.area.floor', { zone, level: descriptor.level })
    case 'outside': return t('zones.area.outside', { zone })
    case 'inside': return t('zones.area.inside', { zone })
    case 'suffix': return t('zones.area.suffix', { zone, suffix: descriptor.suffix })
  }
}
