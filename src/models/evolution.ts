import type { Pokemon } from './pokemon.ts'

export interface EvolutionResource { name: string; url: string }
export interface EvolutionDetail {
  trigger: EvolutionResource
  version_group?: EvolutionResource
  item?: EvolutionResource | null
  held_item?: EvolutionResource | null
  known_move?: EvolutionResource | null
  location?: EvolutionResource | null
  trade_species?: EvolutionResource | null
  party_species?: EvolutionResource | null
  min_level?: number | null
  min_happiness?: number | null
  min_beauty?: number | null
  gender?: number | null
  relative_physical_stats?: number | null
  time_of_day?: string
  near_special_rock?: boolean
  region?: EvolutionResource | null
  condition_expression?: unknown
}
export interface EvolutionLink {
  species: EvolutionResource
  evolution_details: EvolutionDetail[]
  evolves_to: EvolutionLink[]
}
export interface EvolutionNode {
  speciesId: number
  name: string
  methods: EvolutionDetail[]
  children: EvolutionNode[]
}
export interface EvolutionTree {
  root: EvolutionNode
  pokemon: Record<number, Pokemon>
  labels: Record<string, string>
}
