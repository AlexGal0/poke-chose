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
export interface LearnedMove { level: number; slug: string; name: string; type: PokemonType | null; pp: number; category: string; description: string; descriptionSource?: string | null }

export function blackWhiteLearnset(data: LearnsetResponse) {
  const rows = data.moves.flatMap(entry => entry.version_group_details
    .filter(detail => detail.version_group.name === 'black-white' && detail.move_learn_method.name === 'level-up' && Number.isInteger(detail.level_learned_at) && detail.level_learned_at >= 0 && detail.level_learned_at <= 100)
    .map(detail => ({ slug: entry.move.name, level: detail.level_learned_at })))
  return rows.filter((row, index) => rows.findIndex(other => other.slug === row.slug && other.level === row.level) === index)
    .sort((a, b) => a.level - b.level || a.slug.localeCompare(b.slug))
}

export function blackWhiteMove(data: MoveResponse): Omit<LearnedMove, 'level' | 'slug'> {
  // Changelog stores values BEFORE a change. BW is version group 11.
  // Resolve each field independently using its earliest later change.
  const changes = data.past_values.filter(change => Number(change.version_group.url?.split('/').filter(Boolean).at(-1)) > 11)
    .sort((a, b) => Number(a.version_group.url?.split('/').filter(Boolean).at(-1)) - Number(b.version_group.url?.split('/').filter(Boolean).at(-1)))
  const type = changes.find(change => change.type !== null)?.type?.name ?? data.type.name
  const pp = changes.find(change => change.pp !== null)?.pp ?? data.pp
  // PokéAPI's es locale is Spain (es-419 is a separate Latin American locale).
  // BW does not always have Spanish flavor text: prefer nearby games before English.
  const spanish = data.flavor_text_entries.filter(entry => entry.language.name === 'es')
  const versions = ['black-white', 'black-2-white-2', 'heartgold-soulsilver', 'platinum', 'diamond-pearl', 'x-y', 'omega-ruby-alpha-sapphire', 'emerald', 'firered-leafgreen', 'ruby-sapphire', 'sun-moon', 'ultra-sun-ultra-moon', 'sword-shield', 'brilliant-diamond-shining-pearl', 'scarlet-violet']
  const description = versions.map(version => spanish.find(entry => entry.version_group.name === version)).find(Boolean)
    ?? spanish[0]
    ?? data.flavor_text_entries.find(entry => entry.language.name === 'en' && entry.version_group.name === 'black-white')
  const versionLabels: Record<string, string> = { 'black-2-white-2': 'Negro 2/Blanco 2', 'heartgold-soulsilver': 'HeartGold/SoulSilver', platinum: 'Platino', 'diamond-pearl': 'Diamante/Perla', 'x-y': 'X/Y', 'omega-ruby-alpha-sapphire': 'Rubí Omega/Zafiro Alfa', emerald: 'Esmeralda', 'firered-leafgreen': 'Rojo Fuego/Verde Hoja', 'ruby-sapphire': 'Rubí/Zafiro', 'sun-moon': 'Sol/Luna', 'ultra-sun-ultra-moon': 'Ultrasol/Ultraluna', 'sword-shield': 'Espada/Escudo', 'brilliant-diamond-shining-pearl': 'Diamante Brillante/Perla Reluciente', 'scarlet-violet': 'Escarlata/Púrpura' }
  return {
    name: data.names.find(entry => entry.language.name === 'es')?.name ?? data.name,
    type: TYPES.includes(type as PokemonType) ? type as PokemonType : null,
    pp,
    category: ({ physical: 'Físico', special: 'Especial', status: 'Estado' } as Record<string, string>)[data.damage_class.name] ?? 'Sin confirmar',
    description: description ? `${description.language.name === 'en' ? '(EN) ' : ''}${description.flavor_text.replace(/\s+/g, ' ').trim()}` : 'Descripción no disponible en español.',
    descriptionSource: description && description.version_group.name !== 'black-white' ? `Texto de ${versionLabels[description.version_group.name] ?? description.version_group.name}` : null,
  }
}
