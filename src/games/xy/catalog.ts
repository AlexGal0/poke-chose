import { createCatalogService } from '../core/catalog.ts'
import type { CatalogRules, CatalogService } from '../core/catalog.ts'
import regionalSpeciesIds from '../x/data/regional-dex.json' with { type: 'json' }

export function xyCatalogRules(id: 'x' | 'y'): CatalogRules {
  return {
    id, generation: 6, maxSpecies: 721, introducedFrom: 650,
    regionalSpeciesIds,
    types: ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'],
    spriteGeneration: 'generation-vi', spriteVersion: 'x-y',
  }
}

export function createXYCatalog(rules: CatalogRules): CatalogService {
  const catalog = createCatalogService(rules)
  return {
    ...catalog,
    async list(signal) {
      const { publicRosterData } = await import('../x/roster-data.ts')
      signal?.throwIfAborted()
      return publicRosterData.catalog.filter(row => row.isDefault).map(row => ({ id: row.id, name: row.name, types: row.types }))
    },
  }
}
