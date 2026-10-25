import type { BattleStatStages } from '../domain/battle-stat-stages'
import type { CombatObservation } from '../domain/battle-lifecycle'

export interface CombatParticipant {
  identity: string
  speciesId: number
  form: number
  level: number | null
  slot: number | null
  nickname?: string | null
  isEgg?: boolean
  health: { currentHp: number; maxHp: number } | null
  stages: BattleStatStages | null
}
export interface CombatSpecies { id: number; name: string; types: readonly string[]; sprite: string | null; animatedSprite?: string | null }
export interface CombatReading extends CombatObservation<CombatParticipant, CombatParticipant[]> { message: string }
export interface BattleConnection { status: string; message: string; inBattle: boolean }
export interface CombatService {
  resolve(speciesId: number, form: number, signal?: AbortSignal): Promise<CombatSpecies>
  onStatistics?: (participant: CombatParticipant, pokemon: CombatSpecies) => void
}
