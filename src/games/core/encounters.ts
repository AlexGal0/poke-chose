import type { EncounterDetail, EncounterSpecies } from '../../models/encounters.ts'
import type { ManualPokemon } from './catalog.ts'
import { encounterChances } from '../../domain/encounter-chances.ts'
import type { KnowledgeNode } from '../../domain/species-knowledge.ts'
import { filterCaptureMethods } from '../../domain/capture-browser.ts'
import type { GenderDistribution } from '../../models/gender-distribution.ts'

export { filterCaptureProgress } from '../../domain/capture-browser.ts'
export type { CaptureFilter } from '../../domain/capture-browser.ts'

export interface NamedEncounterResource { name: string; names: { es?: string; en?: string } }
export interface EncounterArea extends NamedEncounterResource {
  rows: (Omit<EncounterSpecies, 'details'> & { variety: string; details: (EncounterDetail & { pokemonDetails?: { never_shiny: boolean } })[] })[]
}
export interface EncounterZone extends NamedEncounterResource { id: number; areas: EncounterArea[]; stage?: NamedEncounterResource; noticeKey?: string }
export interface EncounterAtlasData {
  extraSources?: { label: string; url: string }[]
  equipmentMethods?: readonly string[]
  version: string
  retrieved: string
  species: (ManualPokemon & { genderRate: number; genderDistribution?: GenderDistribution | null })[]
  locations: EncounterZone[]
}

export function mergeEncounterSpecies(rows: EncounterSpecies[]): EncounterSpecies[] {
  const merged = new Map<number, EncounterSpecies>()
  for (const row of rows) {
    const previous = merged.get(row.speciesId)
    if (previous) previous.details.push(...row.details)
    else merged.set(row.speciesId, { ...row, details: [...row.details] })
  }
  return [...merged.values()]
}

export function filterEncounterRows(rows: EncounterSpecies[], methods: ReadonlySet<string>, query: string) {
  const normalized = query.trim().toLowerCase()
  return filterCaptureMethods(rows, methods).filter(row => !normalized || `${row.speciesId} ${row.name}`.toLowerCase().includes(normalized))
}

// Compare summed encounter slots, retaining method + conditions. Never compare
// fishing with grass, horde tables with solo tables, or different story gates.
export function betterEncounterZones(speciesId: number, currentId: number, details: EncounterDetail[], zones: readonly EncounterZone[]) {
  const current = encounterChances(details)
  return zones.filter(zone => zone.id !== currentId).flatMap(zone => {
    const rows = mergeEncounterSpecies(zone.areas.flatMap(area => area.rows)).find(row => row.speciesId === speciesId)
    if (!rows) return []
    return encounterChances(rows.details).flatMap(alternative => {
      const comparable = current.filter(group => group.method === alternative.method && JSON.stringify([...group.conditions].sort()) === JSON.stringify([...alternative.conditions].sort()))
      const best = Math.max(...comparable.map(group => group.chance))
      return comparable.length && alternative.chance > best ? [{ zone, method: alternative.method, conditions: alternative.conditions, chance: alternative.chance }] : []
    })
  }).sort((a, b) => b.chance - a.chance)
}

// Gifts and trades do not make a species a unique wild encounter.
export function uniqueEncounterZone(speciesId: number, currentId: number, zones: readonly EncounterZone[]) {
  const wildMethods = new Set(['walk', 'dark-grass', 'grass-spots', 'cave-spots', 'bridge-spots', 'surf', 'surf-spots', 'super-rod', 'super-rod-spots', 'old-rod', 'good-rod', 'rock-smash', 'headbutt', 'roaming-grass', 'roaming-water', 'yellow-flowers', 'red-flowers', 'purple-flowers', 'horde', 'rough-terrain', 'rustling-bush-ambush', 'ceiling-ambush', 'ground-ambush', 'trash-can-ambush', 'sky-ambush', 'berry-trees'])
  const wild = (method: string) => wildMethods.has(method)
  const occurrences = zones.filter(zone => zone.areas.some(area => area.rows.some(row => row.speciesId === speciesId && row.details.some(detail => wild(detail.method)))))
  return occurrences.length === 1 && occurrences[0].id === currentId
}

export function ownedKnowledgeAncestors(root: KnowledgeNode, speciesId: number, owned: ReadonlySet<number>): KnowledgeNode[] {
  function find(node: KnowledgeNode, ancestors: KnowledgeNode[]): KnowledgeNode[] | null {
    if (node.id === speciesId) return ancestors.filter(parent => owned.has(parent.id))
    for (const child of node.children) {
      const result = find(child, [...ancestors, node])
      if (result) return result
    }
    return null
  }
  return find(root, []) ?? []
}
