type T = (key: string, params?: Record<string, unknown>) => string

export function tradeInstructions(t: T, trade: { instructionsKey: string }): string {
  return t(`npcTrades.instructions.${trade.instructionsKey}`)
}
