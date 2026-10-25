import type { ManualPokemon } from './catalog.ts'

export interface AlbumService {
  speciesIds: readonly number[]
  edition: string
  region: string
  columns?: { landscape: number; portrait: number }
  get(id: number, signal?: AbortSignal): Promise<ManualPokemon>
  description(id: number, locale: string, signal?: AbortSignal): Promise<string | null>
  animation(pokemon: ManualPokemon): string | null
}

export interface FlavorEntry { flavor_text: string; language: { name: string }; version: { name: string } }

export function albumDescription(entries: readonly FlavorEntry[], locale: string, versions: readonly string[]): string | null {
  for (const language of [locale, 'en']) {
    const matching = entries.filter(entry => entry.language.name === language)
    const entry = versions.map(version => matching.find(row => row.version.name === version)).find(Boolean) ?? matching[0]
    if (entry) return entry.flavor_text.replace(/[\s\f]+/g, ' ').trim() || null
  }
  return null
}
