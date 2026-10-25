import type { AlbumService, FlavorEntry } from '../core/album.ts'
import { albumDescription } from '../core/album.ts'
import { xCatalogRules } from './catalog.ts'
import { animatedBattleSprite } from '../../sources/battle-sprites.ts'

export const xAlbum: AlbumService = {
  speciesIds: xCatalogRules.regionalSpeciesIds!,
  edition: 'Pokémon X',
  region: 'Kalos',
  async get(id, signal) {
    const { publicRosterData } = await import('./roster-data.ts')
    signal?.throwIfAborted()
    const row = publicRosterData.catalog.find(row => row.id === id && row.isDefault)
    if (!row) throw new Error('Unknown album species')
    return { id: row.id, name: row.name, types: row.types, sprite: row.sprite }
  },
  animation: pokemon => animatedBattleSprite(pokemon.sprite),
  async description(id, locale, signal) {
    if (!xCatalogRules.regionalSpeciesIds!.includes(id)) throw new Error('Unknown album species')
    const key = `poke-chose:cache:x:album-description-v1:${locale}:${id}`
    try {
      const cached: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (typeof cached === 'string' && cached.trim()) return cached
    } catch { /* Optional cache. */ }
    const timeout = AbortSignal.timeout(15000)
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
    if (!response.ok) throw new Error('Album description request failed')
    const data = await response.json() as { flavor_text_entries: FlavorEntry[] }
    const text = albumDescription(data.flavor_text_entries, locale, ['x', 'y'])
    if (text) {
      try { localStorage.setItem(key, JSON.stringify(text)) } catch { /* Optional cache. */ }
    }
    return text
  },
}
