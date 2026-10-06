import { useTranslation } from 'react-i18next'
import type { PokemonType } from '../models/pokemon'
import { typeLabel } from '../i18n/types.ts'

export function TypeBadge({ type }: { type: PokemonType }) {
  const { t } = useTranslation()
  return <span className={`type type-${type}`}>{typeLabel(t, type)}</span>
}
