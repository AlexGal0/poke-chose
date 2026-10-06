import { TYPES } from '../models/pokemon.ts'
import type { PokemonType } from '../models/pokemon.ts'

interface Resource { name: string; url?: string }
export interface LearnsetResponse {
  moves: { move: Resource; version_group_details: { level_learned_at: number; move_learn_method: Resource; version_group: Resource }[] }[]
}
export interface MoveResponse {
  name: string
  type: Resource
  pp: number
  damage_class: Resource
  names: { name: string; language: Resource }[]
  flavor_text_entries: { flavor_text: string; language: Resource; version_group: Resource }[]
  past_values: { type: Resource | null; pp: number | null; version_group: Resource }[]
}
export type MoveCategory = 'physical' | 'special' | 'status' | 'unconfirmed'
export interface LearnedMove { level: number; slug: string; name: string; type: PokemonType | null; pp: number; categoryId: MoveCategory; description: string | null; descriptionLanguage: string | null; descriptionVersionGroup: string | null }

export function blackWhiteLearnset(data: LearnsetResponse) {
  const rows = data.moves.flatMap(entry => entry.version_group_details
    .filter(detail => detail.version_group.name === 'black-white' && detail.move_learn_method.name === 'level-up' && Number.isInteger(detail.level_learned_at) && detail.level_learned_at >= 0 && detail.level_learned_at <= 100)
    .map(detail => ({ slug: entry.move.name, level: detail.level_learned_at })))
  return rows.filter((row, index) => rows.findIndex(other => other.slug === row.slug && other.level === row.level) === index)
    .sort((a, b) => a.level - b.level || a.slug.localeCompare(b.slug))
}

export function blackWhiteMove(data: MoveResponse, locale: string): Omit<LearnedMove, 'level' | 'slug'> {
  // Changelog stores values BEFORE a change. BW is version group 11.
  // Resolve each field independently using its earliest later change.
  const changes = data.past_values.filter(change => Number(change.version_group.url?.split('/').filter(Boolean).at(-1)) > 11)
    .sort((a, b) => Number(a.version_group.url?.split('/').filter(Boolean).at(-1)) - Number(b.version_group.url?.split('/').filter(Boolean).at(-1)))
  const type = changes.find(change => change.type !== null)?.type?.name ?? data.type.name
  const pp = changes.find(change => change.pp !== null)?.pp ?? data.pp
  // PokéAPI's es locale is Spain (es-419 is a separate Latin American locale).
  // BW does not always have flavor text in the requested locale: prefer
  // nearby games in that locale before falling back to English.
  const preferred = data.flavor_text_entries.filter(entry => entry.language.name === locale)
  const versions = ['black-white', 'black-2-white-2', 'heartgold-soulsilver', 'platinum', 'diamond-pearl', 'x-y', 'omega-ruby-alpha-sapphire', 'emerald', 'firered-leafgreen', 'ruby-sapphire', 'sun-moon', 'ultra-sun-ultra-moon', 'sword-shield', 'brilliant-diamond-shining-pearl', 'scarlet-violet']
  const description = versions.map(version => preferred.find(entry => entry.version_group.name === version)).find(Boolean)
    ?? preferred[0]
    ?? (locale === 'en' ? undefined : data.flavor_text_entries.find(entry => entry.language.name === 'en' && entry.version_group.name === 'black-white'))
  return {
    name: data.names.find(entry => entry.language.name === locale)?.name ?? data.names.find(entry => entry.language.name === 'en')?.name ?? data.name,
    type: TYPES.includes(type as PokemonType) ? type as PokemonType : null,
    pp,
    categoryId: ({ physical: 'physical', special: 'special', status: 'status' } as Record<string, MoveCategory>)[data.damage_class.name] ?? 'unconfirmed',
    description: description ? description.flavor_text.replace(/\s+/g, ' ').trim() : null,
    descriptionLanguage: description && description.language.name !== locale ? description.language.name : null,
    descriptionVersionGroup: description && description.version_group.name !== 'black-white' ? description.version_group.name : null,
  }
}
