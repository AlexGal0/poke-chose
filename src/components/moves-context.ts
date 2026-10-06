import { createContext } from 'react'
import type { Pokemon } from '../models/pokemon'
export const MovesContext = createContext<(pokemon: Pokemon) => void>(() => {})
