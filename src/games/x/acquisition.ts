import { localBreedingOnly } from '../core/acquisition.ts'
import type { AcquisitionDetails, AcquisitionRoute, AcquisitionService, AcquisitionText, AcquisitionZone } from '../core/acquisition.ts'
import type { EncounterAtlasData, NamedEncounterResource } from '../core/encounters.ts'
import type { KnowledgeService } from '../core/knowledge.ts'
import type { KnowledgeNode } from '../../domain/species-knowledge.ts'
import { knowledgeEvolutionFacts } from '../../domain/species-knowledge.ts'
import { encounterMethodIcon, isKnownEncounterMethod } from '../../domain/encounter-methods.ts'
import { pokemonDisplayName } from '../../domain/pokemon-names.ts'
import { xEncounters } from './encounters.ts'
import { xKnowledge } from './knowledge.ts'
import { xCatalogRules } from './catalog.ts'

const key = (key: string, params?: Extract<AcquisitionText, { key: string }>['params']): AcquisitionText => ({ key, ...(params ? { params } : {}) })
const icons: Record<string, string> = { capture: '🌿', static: '📍', gift: '🎁', egg: '🥚', fossil: '🦴', 'npc-trade': '🤝', evolution: '🧬', 'trade-evolution': '🔄', breed: '🐣', unknown: '❔' }
const route = (kind: string): AcquisitionRoute => ({ kind, icon: icons[kind], label: key(`xAcquisition.routes.${kind}`) })
const resourceLabel = (resource: NamedEncounterResource, locale: string): AcquisitionText => key(`encounterAtlas.names.${resource.name}`, { defaultValue: resource.names[locale as 'es' | 'en'] ?? resource.names.en ?? resource.name })

interface SpeciesMetadata { id: number; egg_groups: { name: string }[]; is_baby?: boolean }
async function metadata(id: number, signal?: AbortSignal): Promise<SpeciesMetadata> {
  const cacheKey = `poke-chose:cache:x:acquisition-species-v2:${id}`
  const valid = (value: SpeciesMetadata) => value?.id === id && Array.isArray(value.egg_groups) && value.egg_groups.every(group => typeof group.name === 'string')
  signal?.throwIfAborted()
  try { const cached = JSON.parse(localStorage.getItem(cacheKey) ?? 'null'); if (valid(cached)) return cached } catch { /* Optional non-localized metadata cache. */ }
  const timeout = AbortSignal.timeout(15000)
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!response.ok) throw new Error('Acquisition metadata unavailable')
  const value = await response.json() as SpeciesMetadata
  if (!valid(value)) throw new Error('Invalid acquisition metadata')
  signal?.throwIfAborted()
  const result = { id: value.id, is_baby: value.is_baby === true, egg_groups: value.egg_groups.map(group => ({ name: group.name })) }
  try { localStorage.setItem(cacheKey, JSON.stringify(result)) } catch { /* Optional cache. */ }
  return result
}

function familyNode(root: KnowledgeNode, id: number, parent: KnowledgeNode | null = null): { node: KnowledgeNode; parent: KnowledgeNode | null } | null {
  if (root.id === id) return { node: root, parent }
  for (const child of root.children) { const found = familyNode(child, id, root); if (found) return found }
  return null
}

export function createXAcquisitionService(data: EncounterAtlasData = xEncounters, knowledge: KnowledgeService = xKnowledge, loadMetadata = metadata): AcquisitionService {
  function validate(id: number, signal?: AbortSignal) {
    signal?.throwIfAborted()
    if (!Number.isInteger(id) || id < 1 || id > xCatalogRules.maxSpecies) throw new Error('Unsupported X species')
  }
  function occurrences(id: number) {
    return data.locations.flatMap(zone => zone.areas.flatMap(area => area.rows.filter(row => row.speciesId === id).map(row => ({ zone, area, row }))))
  }
  async function load(id: number, locale: string, signal?: AbortSignal) {
    validate(id, signal)
    const [family, species] = await Promise.all([knowledge.evolution({ id, name: String(id) }, locale, signal), loadMetadata(id, signal)])
    signal?.throwIfAborted()
    const found = familyNode(family.root, id)
    const kinds = new Set<string>()
    for (const { row } of occurrences(id)) for (const detail of row.details) {
      if (detail.method === 'gift') kinds.add(detail.instructionsKey === 'encounterAtlas.specialNotes.fossil' ? 'fossil' : 'gift')
      else if (detail.method === 'gift-egg') kinds.add('egg')
      else if (detail.method === 'static') kinds.add('static')
      else if (detail.method === 'npc-trade') kinds.add('npc-trade')
      else if (isKnownEncounterMethod(detail.method)) kinds.add('capture')
      else kinds.add('unknown')
    }
    for (const method of found?.node.methods ?? []) kinds.add(method.trigger.name === 'trade' ? 'trade-evolution' : 'evolution')
    if (family.root.id === id && ((species.is_baby === true && family.root.children.length > 0) || (species.egg_groups.length > 0 && !species.egg_groups.some(group => ['no-eggs', 'ditto'].includes(group.name))))) kinds.add('breed')
    if (!['capture', 'static', 'gift', 'egg', 'fossil', 'npc-trade'].some(kind => kinds.has(kind))) kinds.add('unknown')
    return { family, found, routes: [...kinds].map(route) }
  }
  return {
    id: 'x', gameName: 'POKÉMON X',
    labels: { group: key('xAcquisition.group'), open: key('xAcquisition.open'), hint: key('xAcquisition.hint'), loading: key('xAcquisition.loading'), noEncounters: key('xAcquisition.noEncounters') },
    instructions(id) {
      validate(id)
      const keys = [...new Set(occurrences(id).flatMap(({ row }) => row.details.flatMap(detail => detail.instructionsKey ? [detail.instructionsKey] : [])))]
      return keys.map(label => ({ label: key(label), source: data.extraSources?.find(source => source.label.includes('Gift'))?.url ?? 'https://pokeapi.co/docs/v2#encounters-section' }))
    },
    async breedingOnly(id, signal) { return localBreedingOnly((await load(id, 'en', signal)).routes.map(route => route.kind)) },
    async routes(id, signal) { return (await load(id, 'en', signal)).routes },
    async details(id, locale, signal): Promise<AcquisitionDetails> {
      const { family, found, routes } = await load(id, locale, signal)
      const zones: AcquisitionZone[] = []
      const trades: AcquisitionDetails['trades'][number][] = []
      for (const zone of data.locations) {
        const areas: AcquisitionZone['areas'] = []
        for (const area of zone.areas) {
          const rows = area.rows.filter(row => row.speciesId === id)
          if (!rows.length) continue
          const groups = new Map<string, { method: string; minLevel: number; maxLevel: number; chance: number | null; conditions: AcquisitionText[] }>()
          for (const row of rows) for (const detail of row.details) {
            const grouping = JSON.stringify([row.variety, detail.method, [...detail.conditions].sort(), detail.instructionsKey, detail.trade, detail.pokemonDetails])
            const previous = groups.get(grouping)
            const chance = ['npc-trade', 'gift', 'gift-egg'].includes(detail.method) ? null : detail.chance
            if (previous) {
              previous.minLevel = Math.min(previous.minLevel, detail.minLevel)
              previous.maxLevel = Math.max(previous.maxLevel, detail.maxLevel)
              previous.chance = previous.chance === null || chance === null ? null : Math.min(100, previous.chance + chance)
            } else {
              const conditions: AcquisitionText[] = detail.conditions.map(condition => key(`encounterAtlas.conditions.${condition}`, { defaultValue: condition.replaceAll('-', ' ') }))
              if (row.variety !== row.name) conditions.push(key(`encounterAtlas.varieties.${row.variety}`, { defaultValue: row.variety }))
              if (detail.pokemonDetails?.never_shiny) conditions.push(key('encounterAtlas.shinyLocked'))
              if (zone.noticeKey) conditions.push(key(zone.noticeKey))
              if (detail.instructionsKey) conditions.push(key(detail.instructionsKey))
              groups.set(grouping, { method: detail.method, minLevel: detail.minLevel, maxLevel: detail.maxLevel, chance, conditions })
            }
            if (detail.trade) {
              const tradeId = `${zone.id}:${area.name}:${detail.trade.instructionsKey}`
              if (!trades.some(trade => trade.id === tradeId)) trades.push({ id: tradeId, location: resourceLabel(zone, locale), instructions: key(detail.trade.instructionsKey), requested: detail.trade.requested === 'any' ? key('xAcquisition.anyPokemon') : pokemonDisplayName(detail.trade.requested) })
            }
          }
          const unknownArea = area.name.match(/unknown-area-(\d+)$/)
          const label = area.name.endsWith('-trades') ? key('encounterAtlas.npcTrades')
            : area.name === `${zone.name}-area` ? resourceLabel(zone, locale)
            : area.name.startsWith('friend-safari-') ? key(`types.${area.name.slice('friend-safari-'.length)}`)
            : unknownArea ? key('encounterAtlas.unconfirmedArea', { number: unknownArea[1] })
            : key(`encounterAtlas.areas.${area.name}`, { defaultValue: area.names[locale as 'es' | 'en'] ?? area.names.en ?? area.name })
          areas.push({ id: area.name, ...(zone.areas.length > 1 || area.name.endsWith('-trades') ? { label } : {}), methods: [...new Set([...groups.values()].map(group => group.method))].map(method => ({ id: method, icon: encounterMethodIcon(method), label: isKnownEncounterMethod(method) ? key(`encounterMethods.list.${method}.label`) : key('encounterMethods.unknownLabel', { method }), encounters: [...groups.values()].filter(group => group.method === method).map(({ minLevel, maxLevel, chance, conditions }) => ({ minLevel, maxLevel, chance, conditions })) })) })
        }
        if (areas.length) zones.push({ id: String(zone.id), label: resourceLabel(zone, locale), areas })
      }
      return { routes, zones, trades, evolution: found?.parent ? { from: found.parent.name, methods: found.node.methods.map(method => knowledgeEvolutionFacts(method, id, family.labels).map(fact => key(`speciesKnowledge.conditions.${fact.id}`, fact.params))) } : null }
    },
  }
}

export const xAcquisition = createXAcquisitionService()
