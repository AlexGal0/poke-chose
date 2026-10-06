import type { BlackEncounterDetail } from '../models/encounters'

export function NpcTradeDetails({ details }: { details: BlackEncounterDetail[] }) {
  const trades = details.filter(detail => detail.trade)
  return trades.length ? <div className="npc-trade-details">{trades.map((detail, index) => <p key={index}><strong>Entrega: {detail.trade!.requested}</strong><span>{detail.trade!.instructions}</span><small>Recibes este Pokémon a nivel {detail.minLevel}. Intercambio único con un personaje.</small></p>)}</div> : null
}
