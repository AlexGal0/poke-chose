import type { Stat } from './stats.ts'

export const NATURES = ['hardy', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 'timid', 'hasty', 'serious', 'jolly', 'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 'calm', 'gentle', 'sassy', 'careful', 'quirky'] as const
export type Nature = typeof NATURES[number]
type NatureStat = Exclude<Stat, 'hp'>
export type NatureDetails = { id: Nature; kind: 'neutral' } | { id: Nature; kind: 'changed'; increased: NatureStat; decreased: NatureStat }

// Descriptive effects only: no multipliers or changes to stored values.
const effects: Partial<Record<Nature, readonly [NatureStat, NatureStat]>> = {
  lonely: ['attack', 'defense'], brave: ['attack', 'speed'], adamant: ['attack', 'special-attack'], naughty: ['attack', 'special-defense'],
  bold: ['defense', 'attack'], relaxed: ['defense', 'speed'], impish: ['defense', 'special-attack'], lax: ['defense', 'special-defense'],
  timid: ['speed', 'attack'], hasty: ['speed', 'defense'], jolly: ['speed', 'special-attack'], naive: ['speed', 'special-defense'],
  modest: ['special-attack', 'attack'], mild: ['special-attack', 'defense'], quiet: ['special-attack', 'speed'], rash: ['special-attack', 'special-defense'],
  calm: ['special-defense', 'attack'], gentle: ['special-defense', 'defense'], sassy: ['special-defense', 'speed'], careful: ['special-defense', 'special-attack'],
}

export function natureDetails(natureId: unknown): NatureDetails | null {
  if (typeof natureId !== 'number' || !Number.isInteger(natureId) || natureId < 0 || natureId >= NATURES.length) return null
  const id = NATURES[natureId]
  const effect = effects[id]
  return effect ? { id, kind: 'changed', increased: effect[0], decreased: effect[1] } : { id, kind: 'neutral' }
}
