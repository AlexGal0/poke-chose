import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CombatHeldItem, CombatService } from '../models/combat'

export function BattleHeldItem({ id, service }: { id: number | null | undefined; service: CombatService }) {
  const { t, i18n } = useTranslation()
  const [result, setResult] = useState<{ id: number; locale: string; item: CombatHeldItem } | null>(null)
  const [brokenIcon, setBrokenIcon] = useState<string | null>(null)
  const resolve = service.resolveHeldItem
  const locale = i18n.language
  useEffect(() => {
    if (!id || !resolve) return
    const controller = new AbortController()
    void resolve(id, locale, controller.signal).then(item => {
      if (!controller.signal.aborted) setResult({ id, locale, item })
    }).catch(() => {})
    return () => controller.abort()
  }, [id, locale, resolve])
  if (!id || !resolve) return null
  const item = result?.id === id && result.locale === locale ? result.item : null
  const label = item ? t('battleHeldItem.equipped', { name: item.name }) : t('battleHeldItem.unavailable')
  return <span className="battle-held-item" tabIndex={0} aria-label={label} title={label}>
    {item?.icon && item.icon !== brokenIcon ? <img src={item.icon} alt="" width="28" height="28" onError={() => setBrokenIcon(item.icon)} /> : <span aria-hidden="true">?</span>}
    <span className="battle-held-item-tooltip" role="tooltip">{label}</span>
  </span>
}
