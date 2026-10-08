export const STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const
export type Stat = typeof STATS[number]
export type BaseStats = Record<Stat, number>
// Include ties at the second-highest value; never arbitrarily hide a strength.
export function highestBaseStats(stats: BaseStats): Stat[] {
  const ordered = [...STATS].sort((a, b) => stats[b] - stats[a])
  const cutoff = stats[ordered[1]]
  return ordered.filter(stat => stats[stat] >= cutoff)
}
// Directly stored party values. hp is maximum HP, not remaining HP.
export type CurrentStats = Record<Stat, number>
export const BASE_STAT_MAX = 255

export function isCurrentStats(value: unknown): value is CurrentStats {
  if (!value || typeof value !== 'object') return false
  const stats = value as CurrentStats
  return STATS.every(stat => Number.isInteger(stats[stat]) && stats[stat] >= 0 && stats[stat] <= 65535)
}

export function currentStatsEqual(a: CurrentStats | undefined, b: CurrentStats | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  return STATS.every(stat => a[stat] === b[stat])
}

export function isBaseStats(value: unknown): value is BaseStats {
  if (!value || typeof value !== 'object') return false
  const stats = value as BaseStats
  return STATS.every(stat => Number.isInteger(stats[stat]) && stats[stat] >= 1 && stats[stat] <= BASE_STAT_MAX)
}

export function totalBaseStats(stats: BaseStats): number {
  return STATS.reduce((total, stat) => total + stats[stat], 0)
}

// PK5 form indices for forms with different base stats in Black/White.
// Castform weather forms share stats, but retain their identity in the dialog.
const forms: Record<number, readonly string[]> = {
  351: ['castform', 'castform-sunny', 'castform-rainy', 'castform-snowy'],
  386: ['deoxys-normal', 'deoxys-attack', 'deoxys-defense', 'deoxys-speed'],
  413: ['wormadam-plant', 'wormadam-sandy', 'wormadam-trash'],
  479: ['rotom', 'rotom-heat', 'rotom-wash', 'rotom-frost', 'rotom-fan', 'rotom-mow'],
  487: ['giratina-altered', 'giratina-origin'],
  492: ['shaymin-land', 'shaymin-sky'],
  555: ['darmanitan-standard', 'darmanitan-zen'],
  648: ['meloetta-aria', 'meloetta-pirouette'],
}

export function statsResource(speciesId: number, form = 0): string {
  if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 649 || !Number.isInteger(form) || form < 0 || form > 31) {
    throw new Error('Invalid Gen V Pokémon identity')
  }
  // Therian and fused Kyurem forms were introduced in Black 2/White 2.
  if ([641, 642, 645, 646].includes(speciesId) && form !== 0) throw new Error('Form unavailable in Black/White')
  const varieties = forms[speciesId]
  if (!varieties) return String(speciesId)
  const resource = varieties[form]
  if (!resource) throw new Error('Invalid Black/White form')
  return resource
}

export function statsForm(speciesId: number, form = 0): string | null {
  return forms[speciesId]?.[form] ?? null
}
