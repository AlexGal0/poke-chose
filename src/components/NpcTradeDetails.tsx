import { useTranslation } from 'react-i18next'
import type { BlackEncounterDetail } from '../models/encounters'

export function NpcTradeDetails({ details }: { details: BlackEncounterDetail[] }) {
  const { t } = useTranslation()
  const trades = details.filter(detail => detail.trade)
  return trades.length ? <div className="npc-trade-details">{trades.map((detail, index) => <p key={index}><strong>{t('npcTradeDetails.deliver', { requested: detail.trade!.requested })}</strong><span>{detail.trade!.instructions}</span><small>{t('npcTradeDetails.receiveNote', { level: detail.minLevel })}</small></p>)}</div> : null
}
