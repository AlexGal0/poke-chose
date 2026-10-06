export const TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'] as const

export type PokemonType = typeof TYPES[number]
export interface Pokemon {
  id: number
  name: string
  sprite: string | null
  types: PokemonType[]
  instanceKey?: string
  nickname?: string | null
}
export interface CatalogEntry { id: number; name: string }
export interface CollectionState { collection: Pokemon[]; teamIds: number[] }
