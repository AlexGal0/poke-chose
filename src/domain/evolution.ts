import type { EvolutionDetail, EvolutionLink, EvolutionNode } from '../models/evolution.ts'

export const evolutionResourceId = (url: string) => Number(url.split('/').filter(Boolean).at(-1))

export function ownedPreevolutions(root: EvolutionNode, speciesId: number, ownedSpeciesIds: ReadonlySet<number>): EvolutionNode[] {
  function find(node: EvolutionNode, ancestors: EvolutionNode[]): EvolutionNode[] | null {
    if (node.speciesId === speciesId) return ancestors.filter(ancestor => ownedSpeciesIds.has(ancestor.speciesId))
    for (const child of node.children) {
      const result = find(child, [...ancestors, node])
      if (result) return result
    }
    return null
  }
  return find(root, []) ?? []
}

export function blackWhiteMethods(details: EvolutionDetail[]): EvolutionDetail[] {
  return details.filter(detail => {
    // version_group denotes introduction, not exclusive availability.
    const version = detail.version_group ? evolutionResourceId(detail.version_group.url) : 0
    if (version > 11 || (detail.region && detail.region.name !== 'unova')) return false
    if (detail.location) {
      const location = evolutionResourceId(detail.location.url)
      if (location < 346 || location > 428 || location === 393 || location === 425) return false
    }
    return ['level-up', 'trade', 'use-item', 'shed'].includes(detail.trigger.name)
  })
}

export function blackWhiteEvolutionTree(link: EvolutionLink, root = true): EvolutionNode | null {
  const speciesId = evolutionResourceId(link.species.url)
  if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 649) return null
  const methods = blackWhiteMethods(link.evolution_details)
  if (!root && !methods.length) return null
  return { speciesId, name: link.species.name, methods, children: link.evolves_to.flatMap(child => {
    const node = blackWhiteEvolutionTree(child, false)
    return node ? [node] : []
  }) }
}

export interface EvolutionFact { key: string; params?: Record<string, unknown> }

export function evolutionMethodFacts(detail: EvolutionDetail, targetId: number, labels: Record<string, string> = {}): EvolutionFact[] {
  const label = (resource: { name: string; url: string }) => labels[resource.url] ?? resource.name.replaceAll('-', ' ')
  if (targetId === 292) return [{ key: 'evolutionMethod.nincadaSpecial' }]
  const parts: EvolutionFact[] = [
    detail.trigger.name === 'trade' ? { key: 'evolutionMethod.trade' }
      : detail.trigger.name === 'use-item' ? (detail.item ? { key: 'evolutionMethod.useItem', params: { item: label(detail.item) } } : { key: 'evolutionMethod.useRequiredItem' })
      : detail.min_level ? { key: 'evolutionMethod.level', params: { level: detail.min_level } }
        : { key: 'evolutionMethod.levelUp' },
  ]
  if (detail.held_item) parts.push({ key: 'evolutionMethod.heldItem', params: { item: label(detail.held_item) } })
  if (detail.min_happiness != null) parts.push({ key: 'evolutionMethod.highFriendship' })
  if (detail.min_beauty != null) parts.push({ key: 'evolutionMethod.minBeauty', params: { beauty: detail.min_beauty } })
  if (detail.gender != null) parts.push({ key: detail.gender === 1 ? 'evolutionMethod.genderFemale' : 'evolutionMethod.genderMale' })
  if (detail.time_of_day) parts.push(detail.time_of_day === 'day' ? { key: 'evolutionMethod.timeDay' } : detail.time_of_day === 'night' ? { key: 'evolutionMethod.timeNight' } : { key: 'evolutionMethod.timeOther', params: { time: detail.time_of_day } })
  if (detail.known_move) parts.push({ key: 'evolutionMethod.knownMove', params: { move: label(detail.known_move) } })
  if (detail.trade_species) parts.push({ key: 'evolutionMethod.tradeFor', params: { species: label(detail.trade_species) } })
  if (detail.party_species) parts.push({ key: 'evolutionMethod.partySpecies', params: { species: label(detail.party_species) } })
  if (detail.relative_physical_stats != null) parts.push({ key: ['evolutionMethod.statsAttackLess', 'evolutionMethod.statsAttackEqual', 'evolutionMethod.statsAttackGreater'][detail.relative_physical_stats + 1] })
  if (detail.location) {
    parts.push({ key: 'evolutionMethod.location', params: { locationId: evolutionResourceId(detail.location.url) } })
    if (targetId === 470) parts.push({ key: 'evolutionMethod.mossRock' })
    if (targetId === 471) parts.push({ key: 'evolutionMethod.iceRockBasement' })
  }
  if (targetId === 266 || targetId === 268) parts.push({ key: 'evolutionMethod.wurmpleRandom' })
  return parts
}
