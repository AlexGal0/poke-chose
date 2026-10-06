import { createContext } from 'react'

// An empty/unknown Pokédex reveals no sprites, including in evolution dialogs.
export const DiscoveryContext = createContext<ReadonlySet<number>>(new Set())
