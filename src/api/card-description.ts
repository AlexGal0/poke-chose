import { request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'

export interface FlavorEntry { flavor_text: string; language: { name: string }; version: { name: string } }

export function cardDescription(entries: readonly FlavorEntry[], locale: string): string | null {
  for (const language of [locale, 'en']) {
    const matching = entries.filter(entry => entry.language.name === language)
    const entry = matching.find(entry => entry.version.name === 'black') ?? matching.find(entry => entry.version.name === 'white') ?? matching.find(entry => entry.version.name === 'black-2') ?? matching.find(entry => entry.version.name === 'white-2') ?? matching[0]
    if (entry) return entry.flavor_text.replace(/[\s\f]+/g, ' ').trim()
  }
  return null
}

export async function getCardDescription(id: number, locale: string, signal?: AbortSignal): Promise<string | null> {
  const key = `card-description-bw-${locale}-v2-${id}`
  const cached = readCache<string>(key)
  if (typeof cached === 'string' && cached.trim()) return cached
  const data = await request<{ flavor_text_entries: FlavorEntry[] }>(`pokemon-species/${id}`, signal)
  const description = cardDescription(data.flavor_text_entries, locale)
  if (description) writeCache(key, description)
  return description
}
