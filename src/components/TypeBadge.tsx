import { useTranslation } from 'react-i18next'
import { typeLabel } from '../i18n/types.ts'

export function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  return <span className={`type type-${type}`}>{typeLabel(t, type)}</span>
}
