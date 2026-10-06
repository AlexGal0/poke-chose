import type { EvolutionDetail, EvolutionLink, EvolutionNode } from '../models/evolution.ts'
import { zoneLabel } from './black-zones.ts'

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

export function evolutionMethodLabel(detail: EvolutionDetail, targetId: number, labels: Record<string, string> = {}): string {
  const label = (resource: { name: string; url: string }) => labels[resource.url] ?? resource.name.replaceAll('-', ' ')
  if (targetId === 292) return 'Al evolucionar Nincada al nivel 20: espacio libre en el equipo y una Poké Ball en la mochila'
  const parts = [detail.trigger.name === 'trade' ? 'Intercambiar' : detail.trigger.name === 'use-item' ? `Usar ${detail.item ? label(detail.item) : 'el objeto requerido'}` : detail.min_level ? `Nivel ${detail.min_level}` : 'Subir un nivel']
  if (detail.held_item) parts.push(`con ${label(detail.held_item)} equipado`)
  if (detail.min_happiness != null) parts.push('amistad alta (220 o más en Gen V)')
  if (detail.min_beauty != null) parts.push(`belleza ≥ ${detail.min_beauty} (conservada al transferir desde Gen IV)`)
  if (detail.gender != null) parts.push(detail.gender === 1 ? 'hembra' : 'macho')
  if (detail.time_of_day) parts.push(detail.time_of_day === 'day' ? 'de día' : detail.time_of_day === 'night' ? 'de noche' : detail.time_of_day)
  if (detail.known_move) parts.push(`conociendo ${label(detail.known_move)}`)
  if (detail.trade_species) parts.push(`por ${label(detail.trade_species)}`)
  if (detail.party_species) parts.push(`con ${label(detail.party_species)} en el equipo`)
  if (detail.relative_physical_stats != null) parts.push(['Ataque < Defensa', 'Ataque = Defensa', 'Ataque > Defensa'][detail.relative_physical_stats + 1])
  if (detail.location) {
    parts.push(`en ${zoneLabel({ id: evolutionResourceId(detail.location.url), name: detail.location.name })}`)
    if (targetId === 470) parts.push('junto a la Roca Musgo')
    if (targetId === 471) parts.push('junto a la Roca Hielo del sótano')
  }
  if (targetId === 266 || targetId === 268) parts.push('rama determinada por la personalidad de Wurmple; no se puede elegir')
  return parts.join(' · ')
}
