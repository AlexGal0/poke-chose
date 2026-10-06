import { TYPE_LABELS, type Pokemon } from '../models/pokemon.ts'
import type { CollectionPokemon } from '../models/party.ts'

export type CollectionLocationFilter = 'all' | 'party' | number

export function matchesCollectionLocation(pokemon: Pick<CollectionPokemon, 'location' | 'box'>, filter: CollectionLocationFilter): boolean {
  return filter === 'all' || (filter === 'party' ? pokemon.location === 'party' : pokemon.location === 'box' && pokemon.box === filter)
}

export function normalizeTag(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^#/, '')
}

export function collectionTags(query: string) {
  return query.split(/[\s,]+/).filter(Boolean)
}

export function matchesCollectionTags(pokemon: Pokemon, query: string) {
  const types = pokemon.types.flatMap(type => [type, normalizeTag(TYPE_LABELS[type])])
  return collectionTags(query).every(tag => {
    const normalized = normalizeTag(tag)
    return normalized !== '' && (normalizeTag(pokemon.name).includes(normalized) || normalizeTag(pokemon.nickname ?? '').includes(normalized) || String(pokemon.id) === normalized || types.includes(normalized))
  })
}
