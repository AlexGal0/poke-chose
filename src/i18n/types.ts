import type { PokemonType } from '../models/pokemon.ts'

type T = (key: string) => string

export function typeLabel(t: T, type: PokemonType): string {
  return t(`types.${type}`)
}
