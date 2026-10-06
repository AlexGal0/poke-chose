import { useTranslation } from 'react-i18next'
import type { BlackEncounterDetail } from '../models/encounters'
import { tradeInstructions } from '../i18n/npc-trades'

export function NpcTradeDetails({ details }: { details: BlackEncounterDetail[] }) {
  const { t } = useTranslation()
  const trades = details.filter(detail => detail.trade)
  return trades.length ? <div className="npc-trade-details">{trades.map((detail, index) => <p key={index}><strong>{t('npcTradeDetails.deliver', { requested: detail.trade!.requested })}</strong><span>{tradeInstructions(t, detail.trade!)}</span><small>{t('npcTradeDetails.receiveNote', { level: detail.minLevel })}</small></p>)}</div> : null
}
