import { createContext } from 'react'
import type { Pokemon } from '../models/pokemon'

export type StatsPokemon = Pokemon & { form?: number; isEgg?: boolean; natureId?: number; speciesId?: number }
export const StatsContext = createContext<((pokemon: StatsPokemon) => void) | null>(null)
