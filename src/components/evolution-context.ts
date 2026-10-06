import { createContext } from 'react'

export const EvolutionContext = createContext<(speciesId: number) => void>(() => {})
