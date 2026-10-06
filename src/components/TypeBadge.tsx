import { TYPE_LABELS } from '../models/pokemon'
import type { PokemonType } from '../models/pokemon'

export function TypeBadge({ type }: { type: PokemonType }) {
  return <span className={`type type-${type}`}>{TYPE_LABELS[type]}</span>
}
