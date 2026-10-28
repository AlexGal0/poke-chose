export interface CombatSession<P, T> { inBattle: boolean; enemy: P | null; own: P | null; team: T | null; opponentRosterTotal?: number | null }
export interface CombatObservation<P, T> { status: string; active: boolean | null; enemy: P | null; own: P | null; team: T | null; opponentRosterTotal?: number | null }

export function emptyCombatSession<P, T>(): CombatSession<P, T> {
  return { inBattle: false, enemy: null, own: null, team: null }
}

// Extracted from Black: uncertainty never means the battle has ended.
export function advanceCombatSession<P, T>(previous: CombatSession<P, T>, reading: CombatObservation<P, T>): CombatSession<P, T> {
  if (reading.status !== 'ready') return previous
  if (reading.active === false) return emptyCombatSession<P, T>()
  if (!previous.inBattle && !reading.enemy && reading.active !== true) return previous
  return { inBattle: true, enemy: reading.enemy ?? previous.enemy, own: reading.own ?? previous.own, team: reading.team ?? previous.team,
    opponentRosterTotal: reading.opponentRosterTotal ?? previous.opponentRosterTotal ?? null }
}
