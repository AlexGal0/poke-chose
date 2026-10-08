import { createContext } from 'react'
import type { Pokemon } from '../models/pokemon'

export type StatsPokemon = Pokemon & { form?: number; isEgg?: boolean }
export const StatsContext = createContext<((pokemon: StatsPokemon) => void) | null>(null)
