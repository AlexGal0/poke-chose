export const GAME_MODULES = [
  'team', 'catalog', 'collection', 'captures', 'analysis', 'types',
  'evolutions', 'moves', 'statistics', 'daycare', 'save', 'live', 'battle', 'location', 'repel',
] as const

export type GameModule = typeof GAME_MODULES[number]
export type GameId = 'black' | 'x'

export interface GameProfile {
  id: GameId
  generation: number
  region: string
  symbol: string
  modules: Readonly<Record<GameModule, boolean>>
}

// Availability is explicit: a source adapter alone does not imply game support.
export const GAME_PROFILES: readonly GameProfile[] = [
  {
    id: 'black', generation: 5, region: 'unova', symbol: 'B',
    modules: {
      team: true, catalog: true, collection: true, captures: true, analysis: true,
      types: true, evolutions: true, moves: true, statistics: true, daycare: true,
      save: true, live: true, battle: true, location: true, repel: true,
    },
  },
  {
    id: 'x', generation: 6, region: 'kalos', symbol: 'X',
    modules: {
      team: true, catalog: true, collection: true, captures: true, analysis: true,
      types: true, evolutions: true, moves: true, statistics: true, daycare: true,
      save: true, live: true, battle: true, location: true, repel: false,
    },
  },
]
