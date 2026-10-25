import { createCatalogService } from '../core/catalog.ts'
import type { CatalogRules } from '../core/catalog.ts'
import regionalSpeciesIds from './data/regional-dex.json' with { type: 'json' }

export const xCatalogRules: CatalogRules = {
  id: 'x', generation: 6, maxSpecies: 721, introducedFrom: 650,
  regionalSpeciesIds,
  types: ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'],
  spriteGeneration: 'generation-vi', spriteVersion: 'x-y',
}

const catalog = createCatalogService(xCatalogRules)
export const xCatalog: typeof catalog = {
  ...catalog,
  async list(signal) {
    const { publicRosterData } = await import('./roster-data.ts')
    signal?.throwIfAborted()
    return publicRosterData.catalog.filter(row => row.isDefault).map(row => ({ id: row.id, name: row.name, types: row.types }))
  },
}
