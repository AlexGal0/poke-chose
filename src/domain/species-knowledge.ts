import { STATS, isBaseStats } from './stats.ts'
import type { BaseStats } from './stats.ts'
import type { LearnsetResponse, LearnedMove, MoveResponse } from './moves.ts'
import type { EvolutionDetail, EvolutionResource } from '../models/evolution.ts'

export interface KnowledgeRules {
  gameId: string
  generation: number
  versionGroup: string
  versionGroupId: number
  maxSpecies: number
  region: string
  types: readonly string[]
}
export interface HistoricalStatResponse {
  stats: { base_stat: number; stat: { name: string } }[]
  past_stats: { generation: { name: string }; stats: { base_stat: number; stat: { name: string } }[] }[]
}
const generations = ['generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v', 'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix']

export function historicalBaseStats(data: HistoricalStatResponse, generation: number): BaseStats {
  if (!Array.isArray(data.stats) || !Array.isArray(data.past_stats)) throw new Error('Missing stat history')
  const result = {} as BaseStats
  for (const stat of STATS) {
    const current = data.stats.filter(row => row.stat.name === stat)
    if (current.length !== 1) throw new Error('Incomplete or duplicated stats')
    const past = data.past_stats.filter(row => generations.indexOf(row.generation.name) + 1 >= generation && row.stats.some(entry => entry.stat.name === stat))
      .sort((a, b) => generations.indexOf(a.generation.name) - generations.indexOf(b.generation.name))[0]
    const values = past?.stats.filter(row => row.stat.name === stat)
    if (values && values.length !== 1) throw new Error('Duplicated historical stat')
    result[stat] = values ? values[0].base_stat : current[0].base_stat
  }
  if (!isBaseStats(result)) throw new Error('Invalid stats')
  return result
}

export function versionLearnset(data: LearnsetResponse, versionGroup: string) {
  const rows = data.moves.flatMap(entry => entry.version_group_details
    .filter(detail => detail.version_group.name === versionGroup && detail.move_learn_method.name === 'level-up' && Number.isInteger(detail.level_learned_at) && detail.level_learned_at >= 0 && detail.level_learned_at <= 100)
    .map(detail => ({ slug: entry.move.name, level: detail.level_learned_at })))
  return rows.filter((row, index) => rows.findIndex(other => other.slug === row.slug && other.level === row.level) === index)
    .sort((a, b) => a.level - b.level || a.slug.localeCompare(b.slug))
}

export const resourceId = (url: string) => Number(url.split('/').filter(Boolean).at(-1))
export type KnowledgeMove = Omit<LearnedMove, 'type'> & { type: string | null }
export function versionMove(data: MoveResponse, rules: KnowledgeRules, locale: string): Omit<KnowledgeMove, 'level' | 'slug'> {
  const changes = data.past_values.filter(change => resourceId(change.version_group.url ?? '') > rules.versionGroupId)
    .sort((a, b) => resourceId(a.version_group.url ?? '') - resourceId(b.version_group.url ?? ''))
  const type = changes.find(change => change.type != null)?.type?.name ?? data.type.name
  const pp = changes.find(change => change.pp != null)?.pp ?? data.pp
  if (!Number.isInteger(pp) || pp < 1) throw new Error('Invalid move PP')
  const description = data.flavor_text_entries.find(row => row.language.name === locale && row.version_group.name === rules.versionGroup)
    ?? data.flavor_text_entries.find(row => row.language.name === 'en' && row.version_group.name === rules.versionGroup)
  return {
    name: data.names.find(row => row.language.name === locale)?.name ?? data.names.find(row => row.language.name === 'en')?.name ?? data.name,
    type: rules.types.includes(type) ? type : null, pp,
    categoryId: data.damage_class.name === 'physical' || data.damage_class.name === 'special' || data.damage_class.name === 'status' ? data.damage_class.name : 'unconfirmed',
    description: description?.flavor_text.replace(/\s+/g, ' ').trim() ?? null,
    descriptionLanguage: description && description.language.name !== locale ? description.language.name : null,
    descriptionVersionGroup: null,
  }
}

export interface KnowledgeEvolutionDetail extends EvolutionDetail {
  known_move_type?: EvolutionResource | null
  party_type?: EvolutionResource | null
  min_affection?: number | null
  needs_overworld_rain?: boolean
  turn_upside_down?: boolean
  required_pokemon_form?: EvolutionResource | null
  evolved_pokemon_form?: EvolutionResource | null
  base_form?: EvolutionResource | null
  evolved_form?: EvolutionResource | null
  [key: string]: unknown
}
export interface KnowledgeLink {
  species: EvolutionResource
  evolution_details: KnowledgeEvolutionDetail[]
  evolves_to: KnowledgeLink[]
}
export interface KnowledgeNode {
  id: number
  name: string
  methods: KnowledgeEvolutionDetail[]
  children: KnowledgeNode[]
}

export function evolutionForRules(link: KnowledgeLink, rules: KnowledgeRules, locations: ReadonlySet<number>, root = true): KnowledgeNode | null {
  const id = resourceId(link.species.url)
  if (!Number.isInteger(id) || id < 1 || id > rules.maxSpecies) return null
  const methods = link.evolution_details.filter(detail => {
    const introduction = detail.version_group ? resourceId(detail.version_group.url) : 0
    if (introduction > rules.versionGroupId || (detail.region && detail.region.name !== rules.region)) return false
    if (detail.location && !locations.has(resourceId(detail.location.url))) return false
    // This workspace only exposes default species varieties, never regional forms.
    if ([detail.required_pokemon_form, detail.evolved_pokemon_form, detail.base_form, detail.evolved_form].some(form => form && /-(alola|galar|hisui|paldea)(-|$)/.test(form.name))) return false
    return true
  })
  if (!root && !methods.length) return null
  return { id, name: link.species.name, methods, children: link.evolves_to.flatMap(child => {
    const node = evolutionForRules(child, rules, locations, false)
    return node ? [node] : []
  }) }
}

export interface KnowledgeFact { id: string; params?: Record<string, string | number> }
export function knowledgeEvolutionFacts(detail: KnowledgeEvolutionDetail, targetId: number, labels: Record<string, string>): KnowledgeFact[] {
  const facts: KnowledgeFact[] = []
  const add = (id: string, params?: KnowledgeFact['params']) => facts.push({ id, params })
  const label = (resource: EvolutionResource) => labels[resource.url] ?? resource.name
  if (targetId === 292) { add('shed'); return facts }
  if (detail.trigger.name === 'level-up') add(detail.min_level ? 'level' : 'levelUp', detail.min_level ? { level: detail.min_level } : undefined)
  else if (detail.trigger.name === 'trade') add('trade')
  else if (detail.trigger.name === 'use-item' && detail.item) add('item', { name: label(detail.item) })
  else add('unconfirmed')
  if (detail.held_item) add('heldItem', { name: label(detail.held_item) })
  if (detail.min_happiness != null) add('friendship')
  if (detail.min_beauty != null) add('beauty', { value: detail.min_beauty })
  if (detail.min_affection != null) add('affection', { value: detail.min_affection })
  if (detail.gender != null) add(detail.gender === 1 ? 'female' : 'male')
  if (detail.time_of_day) add(detail.time_of_day === 'day' ? 'day' : detail.time_of_day === 'night' ? 'night' : 'unconfirmed')
  for (const [field, id] of [['known_move', 'knownMove'], ['known_move_type', 'knownType'], ['party_species', 'partySpecies'], ['party_type', 'partyType'], ['trade_species', 'tradeSpecies'], ['location', 'location']] as const) {
    const resource = detail[field]
    if (resource) add(id, { name: label(resource) })
  }
  if (detail.near_special_rock) add(targetId === 470 ? 'mossRock' : targetId === 471 ? 'iceRock' : 'specialRock')
  if (detail.relative_physical_stats != null) add(['attackLess', 'attackEqual', 'attackGreater'][detail.relative_physical_stats + 1] ?? 'unconfirmed')
  if (detail.needs_overworld_rain) add('rain')
  if (detail.turn_upside_down) add('upsideDown')
  if (targetId === 266 || targetId === 268) add('wurmple')
  const known = new Set(['trigger', 'version_group', 'item', 'held_item', 'known_move', 'known_move_type', 'location', 'trade_species', 'party_species', 'party_type', 'min_level', 'min_happiness', 'min_beauty', 'min_affection', 'gender', 'relative_physical_stats', 'time_of_day', 'near_special_rock', 'needs_overworld_rain', 'turn_upside_down', 'region', 'required_pokemon_form', 'evolved_pokemon_form', 'base_form', 'evolved_form', 'is_default'])
  if (Object.entries(detail).some(([key, value]) => !known.has(key) && value != null && value !== false && value !== '' && (!Array.isArray(value) || value.length > 0))) add('unconfirmed')
  return facts
}
