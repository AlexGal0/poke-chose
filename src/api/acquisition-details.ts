import { request } from './pokeapi.ts'
import { getEvolutionSpecies, getEvolutionTree } from './evolution.ts'
import { evolutionResourceId } from '../domain/evolution.ts'
import { acquisitionTags } from '../domain/acquisition.ts'
import { findEvolutionNode } from '../domain/acquisition.ts'
import type { EvolutionNode } from '../models/evolution.ts'
import { readCache, writeCache } from '../storage/local.ts'

export interface AcquisitionEncounter {
  location_area: { name: string; url: string }
  version_details: { version: { name: string }; encounter_details: { method: { name: string }; min_level: number; max_level: number; chance: number; condition_values: { name: string }[] }[] }[]
}
export function blackAcquisitionEncounters(encounters: readonly AcquisitionEncounter[]) {
  return encounters.flatMap(row => row.version_details.filter(version => version.version.name === 'black').flatMap(version =>
    version.encounter_details.map(detail => ({ area: row.location_area.name, ...detail }))))
}
export async function getAcquisitionDetails(speciesId: number, locale: string, signal?: AbortSignal) {
  const species = await getEvolutionSpecies(speciesId, signal)
  const variety = species.varieties?.find(variety => variety.is_default)?.pokemon.url
  const id = variety ? evolutionResourceId(variety) : speciesId
  const key = `acquisition-black-encounters-v1-${id}`
  const [encounters, tree] = await Promise.all([
    readCache<AcquisitionEncounter[]>(key) ?? request<AcquisitionEncounter[]>(`pokemon/${id}/encounters`, signal),
    getEvolutionTree(speciesId, locale, signal),
  ])
  writeCache(key, encounters)
  const node = findEvolutionNode(tree.root, speciesId)
  function parentOf(node: EvolutionNode): EvolutionNode | null {
    if (node.children.some(child => child.speciesId === speciesId)) return node
    return node.children.map(parentOf).find(Boolean) ?? null
  }
  const breedable = tree.root.speciesId === speciesId && Boolean(species.egg_groups?.length) && !species.egg_groups?.some(group => ['no-eggs', 'ditto'].includes(group.name))
  return { encounters: blackAcquisitionEncounters(encounters), tree, node, parent: parentOf(tree.root), tags: acquisitionTags(speciesId, encounters, node, breedable) }
}
