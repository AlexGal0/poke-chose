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
export const TYPE_LABELS: Record<PokemonType, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
  ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
  psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero',
}
