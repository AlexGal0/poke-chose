import type { AcquisitionAvailability, IndependentAvailability } from '../core/acquisition.ts'
import type { EncounterAtlasData } from '../core/encounters.ts'
import type { KnowledgeNode } from '../../domain/species-knowledge.ts'
import { isKnownEncounterMethod } from '../../domain/encounter-methods.ts'

// Species, not Mega forms. Audit: https://www.serebii.net/xy/exclusives.shtml
// Friend Safari is excluded. Slurpuff/Aromatisse require a player trade, so
// neither is independently obtainable in either edition.
export const xyExclusiveSpecies = {
  x: [120, 121, 127, 228, 229, 261, 262, 304, 305, 306, 345, 346, 347, 348, 539, 684, 692, 693, 716],
  y: [90, 91, 138, 139, 140, 141, 214, 246, 247, 248, 309, 310, 509, 510, 538, 682, 690, 691, 717],
} as const
const tradedSpecies = new Set([683, 685])
export const xyExclusiveFossils = new Set([138, 140, 345, 347])
const stones = new Set(['water-stone', 'fire-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone'])

export function independentXYAvailability(game: 'x' | 'y', id: number, data: EncounterAtlasData, root?: KnowledgeNode): IndependentAvailability {
  const other = game === 'x' ? 'y' : 'x'
  if ((xyExclusiveSpecies[other] as readonly number[]).includes(id) || tradedSpecies.has(id)) return 'unobtainable'
  if ((xyExclusiveSpecies[game] as readonly number[]).includes(id)) return 'obtainable'
  const rows = data.locations.filter(zone => zone.name !== 'friend-safari').flatMap(zone => zone.areas.flatMap(area => area.rows))
  const direct = new Set(rows.filter(row => row.details.some(detail => detail.method !== 'npc-trade' && isKnownEncounterMethod(detail.method))).map(row => row.speciesId))
  for (const value of xyExclusiveSpecies[game]) direct.add(value)
  let changed = true
  while (changed) {
    changed = false
    for (const row of rows) if (!direct.has(row.speciesId) && row.details.some(detail => detail.trade && (detail.trade.requested === 'any' ? direct.size > 0 : data.species.some(species => species.name === detail.trade!.requested && direct.has(species.id))))) {
      direct.add(row.speciesId)
      changed = true
    }
  }
  if (direct.has(id)) return 'obtainable'
  if (!root) return 'unknown'
  const reachable = new Set(direct)
  for (const value of xyExclusiveSpecies[game]) reachable.add(value)
  function evolve(node: KnowledgeNode) {
    for (const child of node.children) {
      if (reachable.has(node.id) && child.methods.some(method =>
        (method.trigger.name === 'level-up' || (method.trigger.name === 'use-item' && method.item && stones.has(method.item.name))) &&
        !method.min_beauty && !method.condition_expression &&
        (!method.party_species || reachable.has(Number(method.party_species.url.match(/\/(\d+)\/?$/)?.[1])))
      )) reachable.add(child.id)
      evolve(child)
    }
  }
  evolve(root)
  // Ditto and all breeding incenses are available locally in XY. Breeding a
  // reachable evolved member provides its base, including babies.
  if (direct.has(132) && root.children.length && [...reachable].some(value => contains(root, value))) reachable.add(root.id)
  evolve(root)
  return reachable.has(id) ? 'obtainable' : 'unknown'
}

function contains(node: KnowledgeNode, id: number): boolean {
  return node.id === id || node.children.some(child => contains(child, id))
}

export function xyAvailability(game: 'x' | 'y', id: number, data: EncounterAtlasData, counterpart: EncounterAtlasData, root?: KnowledgeNode): AcquisitionAvailability {
  const other = game === 'x' ? 'y' : 'x'
  return { independent: independentXYAvailability(game, id, data, root), counterpart: { gameId: other, gameName: { key: `games.names.${other}` }, independent: independentXYAvailability(other, id, counterpart, root) } }
}
