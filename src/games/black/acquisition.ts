import { localBreedingOnly } from '../core/acquisition.ts'
import { getEvolutionSpecies } from '../../api/evolution.ts'
import type { AcquisitionDetails, AcquisitionRoute, AcquisitionService, AcquisitionText, AcquisitionZone } from '../core/acquisition.ts'
import { getAcquisitionTags } from '../../api/acquisition.ts'
import { getAcquisitionDetails } from '../../api/acquisition-details.ts'
import { blackAcquisitionInstructions } from '../../domain/acquisition-instructions.ts'
import { summarizeAcquisitionEncounters } from '../../domain/acquisition-encounters.ts'
import { areaDescriptor, zoneSlug } from '../../domain/black-zones.ts'
import { blackNpcTrades } from '../../domain/npc-trades.ts'
import { evolutionMethodFacts } from '../../domain/evolution.ts'
import { encounterMethodIcon, isKnownEncounterMethod } from '../../domain/encounter-methods.ts'
import { isKnownSeason } from '../../domain/encounter-seasons.ts'
import type { AcquisitionTag } from '../../domain/acquisition.ts'

const key = (key: string, params?: Extract<AcquisitionText, { key: string }>['params']): AcquisitionText => ({ key, ...(params ? { params } : {}) })
const route = (tag: AcquisitionTag): AcquisitionRoute => ({ ...tag, label: key(`acquisition.label.${tag.kind}`) })

function areaText(area: string): AcquisitionText {
  const descriptor = areaDescriptor(area)
  if (descriptor.kind === 'unknown') return key('zones.area.unknown', { raw: descriptor.raw })
  const params: Extract<AcquisitionText, { key: string }>['params'] = { zone: key(`zones.list.${descriptor.zoneSlug}`) }
  if ('level' in descriptor) params.level = descriptor.level
  if ('suffix' in descriptor) params.suffix = descriptor.suffix
  return key(`zones.area.${descriptor.kind}`, params)
}

export function normalizeBlackAcquisition(speciesId: number, data: Awaited<ReturnType<typeof getAcquisitionDetails>>): AcquisitionDetails {
  const groups = new Map<string, Map<string, typeof data.encounters>>()
  for (const row of summarizeAcquisitionEncounters(data.encounters)) {
    const descriptor = areaDescriptor(row.area)
    const zone = descriptor.kind === 'unknown' ? row.area : descriptor.zoneSlug
    if (!groups.has(zone)) groups.set(zone, new Map())
    const areas = groups.get(zone)!
    if (!areas.has(row.area)) areas.set(row.area, [])
    areas.get(row.area)!.push(row)
  }
  const zones: AcquisitionZone[] = [...groups].map(([zone, areas]) => ({
    id: zone, label: areaDescriptor(zone).kind === 'unknown' ? areaText(zone) : key(`zones.list.${zone}`),
    areas: [...areas].map(([area, rows]) => ({
      id: area, ...(areas.size > 1 || areaDescriptor(area).kind !== 'main' ? { label: areaText(area) } : {}),
      methods: [...new Set(rows.map(row => row.method.name))].map(method => ({
        id: method, icon: encounterMethodIcon(method),
        label: isKnownEncounterMethod(method) ? key(`encounterMethods.list.${method}.label`) : key('encounterMethods.unknownLabel', { method: method.replace(/[-_]+/g, ' ') }),
        encounters: rows.filter(row => row.method.name === method).map(row => ({
          minLevel: row.min_level, maxLevel: row.max_level, chance: method === 'npc-trade' ? null : row.chance,
          conditions: row.condition_values.map(condition => isKnownSeason(condition.name) ? key(`encounterSeasons.list.${condition.name}`) : { text: condition.name }),
        })),
      })),
    })),
  }))
  return {
    routes: data.tags.map(route), zones,
    trades: blackNpcTrades.filter(trade => trade.speciesId === speciesId).map(trade => ({
      id: String(trade.locationId), location: key(`zones.list.${zoneSlug({ id: trade.locationId, name: trade.area })}`),
      instructions: key(`npcTrades.instructions.${trade.name}`), requested: trade.requested,
    })),
    evolution: data.parent && data.node ? {
      from: data.parent.name,
      methods: data.node.methods.map(method => evolutionMethodFacts(method, speciesId, data.tree.labels).map(fact => {
        if (fact.key === 'evolutionMethod.location') {
          const slug = zoneSlug({ id: fact.params!.locationId as number, name: '' })
          return key(fact.key, { zone: key(slug ? `zones.list.${slug}` : 'zones.noNameVerified') })
        }
        const params = Object.fromEntries(Object.entries(fact.params ?? {}).filter((entry): entry is [string, string | number | boolean] => ['string', 'number', 'boolean'].includes(typeof entry[1])))
        return key(fact.key, params)
      })),
    } : null,
  }
}

export function createBlackAcquisitionService(dependencies = { routes: getAcquisitionTags, details: getAcquisitionDetails }): AcquisitionService {
  return {
    id: 'black', gameName: 'POKÉMON BLACK',
    labels: { group: key('acquisitionIcons.groupAria'), open: key('acquisitionDetails.open'), hint: key('acquisitionDetails.hint'), loading: key('acquisitionDetails.loading'), noEncounters: key('acquisitionDetails.noEncounters') },
    async breedingOnly(id, signal) {
      const [tags, species] = await Promise.all([dependencies.routes(id, signal), getEvolutionSpecies(id, signal)])
      return localBreedingOnly(tags.map(tag => tag.kind), species.is_baby === true)
    },
    instructions: speciesId => blackAcquisitionInstructions(speciesId).map(instruction => ({ label: key(`acquisitionDetails.instructions.${instruction.key}`), source: instruction.source })),
    async routes(speciesId, signal) { return (await dependencies.routes(speciesId, signal)).map(route) },
    async details(speciesId, locale, signal) { return normalizeBlackAcquisition(speciesId, await dependencies.details(speciesId, locale, signal)) },
  }
}

export const blackAcquisition = createBlackAcquisitionService()
