import { BATTLE_STATS } from '../../src/domain/battle-stat-stages.ts'

// ROM-specific BTL_POKEPARAM stores seven rank bytes, with neutral encoded as 6.
// The observed block begins at +0xfc from the parameter pointer (species - 12).
export async function readStatStageBytes(reader, address, config) {
  const offset = config.battleStatStagesOffset
  if (offset === undefined) return null
  if (!Number.isInteger(offset) || offset < 28 || offset + 7 > 0x224 || address - 12 + offset + 7 > 0x02400000) throw new Error('Offset de cambios de estadísticas inválido.')
  return reader.readMemory(address - 12 + offset, 7)
}

export function stableStatStages(first, second) {
  if (!first || !second || first.length !== 7 || !first.equals(second) || [...first].some(value => value > 12)) return {}
  return { statStages: Object.fromEntries(BATTLE_STATS.map((stat, index) => [stat, first[index] - 6])) }
}
