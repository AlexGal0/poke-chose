import { createContext } from 'react'
import type { Pokemon } from '../models/pokemon'
import type { CollectionPokemon } from '../models/party'

export type StatsPokemon = Pokemon & Partial<Omit<CollectionPokemon, keyof Pokemon>>
export const StatsContext = createContext<((pokemon: StatsPokemon) => void) | null>(null)
