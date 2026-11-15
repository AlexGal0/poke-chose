import { ySavedPokemon } from './saved-roster.ts'
import { yKnowledge } from './knowledge.ts'
import { evolutionLevelsRemaining } from '../../domain/evolution-progress.ts'
import type { KnowledgeNode } from '../../domain/species-knowledge.ts'
import type { DaycareReading, DaycareService } from '../core/daycare.ts'
import type { PokedexBridgeSnapshot } from '../../sources/pokedex-snapshot.ts'
import type { LivePartySnapshot } from '../../sources/live-party-snapshot.ts'

export function yDaycareEvolutionLevel(root: KnowledgeNode, speciesId: number): number | null {
  const find = (node: KnowledgeNode): KnowledgeNode | undefined => node.id === speciesId ? node : node.children.map(find).find(Boolean)
  const remaining = evolutionLevelsRemaining(find(root)?.children.flatMap(child => child.methods) ?? [], 1)
  return remaining === null ? null : remaining + 1
}

export const yDaycareService: DaycareService = {
  async resolve(speciesId, form, signal) {
    signal?.throwIfAborted()
    const pokemon = await ySavedPokemon({ speciesId, form })
    signal?.throwIfAborted()
    return pokemon
  },
  async experienceLevels(speciesId, signal) {
    signal?.throwIfAborted()
    const pokemon = await ySavedPokemon({ speciesId, form: 0 })
    signal?.throwIfAborted()
    return pokemon.experienceLevels
  },
  async evolutionLevel(speciesId, signal) {
    const pokemon = await ySavedPokemon({ speciesId, form: 0 })
    // Numeric thresholds are locale-free; localized details open through KnowledgeContext.
    const family = await yKnowledge.evolution(pokemon, 'en', signal)
    return yDaycareEvolutionLevel(family.root, speciesId)
  },
}

export function yDaycareReading(mode: 'manual' | 'save' | 'live', save: PokedexBridgeSnapshot, live: LivePartySnapshot): DaycareReading {
  if (mode === 'manual') return { available: false, stale: true, data: null }
  const snapshot = mode === 'save' ? save : live
  const available = snapshot.capabilities?.daycare === true
  return { available, stale: snapshot.status !== 'ready' || snapshot.daycareStale !== false, data: available ? snapshot.daycare ?? null : null }
}
