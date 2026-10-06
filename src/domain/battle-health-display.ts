import type { BattleHealth } from './enemy-prototype.ts'

export interface BattleHealthDisplay {
  identity: string
  health: BattleHealth | null
  hit: number
  damageFraction: number
}

export function updateBattleHealthDisplay(previous: BattleHealthDisplay, identity: string, health: BattleHealth | null): BattleHealthDisplay {
  if (identity !== previous.identity) return { identity, health, hit: 0, damageFraction: 0 }
  if (!health || (previous.health?.currentHp === health.currentHp && previous.health.maxHp === health.maxHp)) return previous
  const damage = previous.health && previous.health.maxHp === health.maxHp ? previous.health.currentHp - health.currentHp : 0
  return { identity, health, hit: previous.hit + (damage > 0 ? 1 : 0), damageFraction: damage > 0 ? damage / health.maxHp : previous.damageFraction }
}
