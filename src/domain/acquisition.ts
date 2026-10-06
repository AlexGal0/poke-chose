import type { EvolutionNode } from '../models/evolution.ts'
import { blackNpcTrades } from './npc-trades.ts'

export type AcquisitionKind = 'capture' | 'static' | 'gift' | 'egg' | 'fossil' | 'npc-trade' | 'evolution' | 'trade-evolution' | 'breed' | 'external' | 'event' | 'unknown'
export interface AcquisitionTag { kind: AcquisitionKind; icon: string; label: string }
export interface PokemonEncounter {
  version_details: { version: { name: string }; encounter_details: { method: { name: string } }[] }[]
}

const tags: Record<AcquisitionKind, { icon: string; label: string }> = {
  capture: { icon: '🌿', label: 'Capturable en Pokémon Black. Consulta las zonas y condiciones de encuentro.' },
  static: { icon: '📍', label: 'Encuentro fijo en Pokémon Black; puede requerir progreso o condiciones especiales.' },
  gift: { icon: '🎁', label: 'Regalo en Pokémon Black; puede depender de una elección o de condiciones especiales.' },
  egg: { icon: '🥚', label: 'Huevo de regalo en Pokémon Black.' },
  fossil: { icon: '🦴', label: 'Revivir un fósil en el museo de Ciudad Esmalte. La elección y el progreso pueden limitar su disponibilidad.' },
  'npc-trade': { icon: '🤝', label: 'Intercambio con un personaje de Pokémon Black; requiere el Pokémon solicitado.' },
  evolution: { icon: '🧬', label: 'Evolución en Generación V. Necesitas su preevolución; consulta el árbol para ver los requisitos.' },
  'trade-evolution': { icon: '🔄', label: 'Evolución por intercambio. Puede requerir un objeto o intercambiar por una especie concreta.' },
  breed: { icon: '🐣', label: 'Cría: obtener un huevo con padres compatibles. Algunas especies requieren incienso; necesitas conseguir los padres.' },
  external: { icon: '📥', label: 'Sin obtención directa en el juego normal de Black: traer la especie o su familia de otro juego mediante intercambio o transferencia.' },
  event: { icon: '✨', label: 'Evento o distribución especial; no se garantiza que siga disponible. También puede recibirse de otro jugador.' },
  unknown: { icon: '❔', label: 'Obtención sin confirmar: no hay una vía directa registrada. Esto no demuestra que solo se consiga evolucionando o intercambiando.' },
}

// Verified BW fossil revivals, separate from PokéAPI's generic gift method.
// https://www.wikidex.net/wiki/Fósil
const fossils = new Set([138, 140, 142, 345, 347, 408, 410, 564, 566])
// Families with no normal local acquisition in Black (White exclusives).
// https://www.wikidex.net/wiki/Solosis
// https://www.wikidex.net/wiki/Rufflet
const externalFamilies = new Set([577, 578, 579, 627, 628])

export function acquisitionTag(kind: AcquisitionKind): AcquisitionTag {
  return { kind, ...tags[kind] }
}

export function findEvolutionNode(root: EvolutionNode, speciesId: number): EvolutionNode | undefined {
  if (root.speciesId === speciesId) return root
  for (const child of root.children) {
    const match = findEvolutionNode(child, speciesId)
    if (match) return match
  }
}

export function acquisitionTags(speciesId: number, encounters: PokemonEncounter[], node: EvolutionNode | undefined, breedableBase = false): AcquisitionTag[] {
  const kinds = new Set<AcquisitionKind>()
  if (blackNpcTrades.some(trade => trade.speciesId === speciesId)) kinds.add('npc-trade')
  const wildMethods = new Set(['walk', 'dark-grass', 'grass-spots', 'cave-spots', 'bridge-spots', 'surf', 'surf-spots', 'super-rod', 'super-rod-spots', 'old-rod', 'good-rod', 'rock-smash', 'headbutt', 'roaming-grass', 'roaming-water'])
  for (const encounter of encounters) for (const version of encounter.version_details) {
    if (version.version.name !== 'black') continue
    for (const { method } of version.encounter_details) {
      if (wildMethods.has(method.name)) kinds.add('capture')
      else if (method.name === 'static') kinds.add('static')
      else if (method.name === 'gift') kinds.add(fossils.has(speciesId) ? 'fossil' : 'gift')
      else if (method.name === 'gift-egg') kinds.add('egg')
      else if (method.name === 'npc-trade') kinds.add('npc-trade')
      else kinds.add('unknown')
    }
  }
  if (fossils.has(speciesId)) kinds.add('fossil')
  for (const method of node?.methods ?? []) {
    kinds.add(method.trigger.name === 'trade' ? 'trade-evolution' : 'evolution')
  }
  if (breedableBase || speciesId === 489) kinds.add('breed')
  if (externalFamilies.has(speciesId) || speciesId === 642 || speciesId === 644) kinds.add('external')
  // Zekrom/Thundurus also had distributions; Gen V mythicals require events.
  if ([494, 642, 644, 647, 648, 649].includes(speciesId)) kinds.add('event')
  const confirmed: AcquisitionKind[] = ['capture', 'static', 'gift', 'egg', 'fossil', 'npc-trade', 'external', 'event']
  const direct = confirmed.some(kind => kinds.has(kind))
  // Preserve uncertainty even for an evolved species whose direct encounters are absent.
  if (!direct) kinds.add('unknown')
  return [...kinds].map(acquisitionTag)
}
