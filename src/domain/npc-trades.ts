import type { EncounterSpecies } from '../models/encounters.ts'

// Original Pokémon Black only. White and Black 2 trades are deliberately separate.
// https://www.wikidex.net/wiki/Lista_de_intercambios_Pok%C3%A9mon_de_los_videojuegos
export const blackNpcTrades = [
  { locationId: 349, area: 'nacrene-city', speciesId: 548, name: 'petilil', level: 15, requested: 'Cottonee', conditions: [] },
  { locationId: 352, area: 'driftveil-city', speciesId: 550, name: 'basculin', level: 25, requested: 'Minccino', conditions: [] },
  { locationId: 362, area: 'unova-route-7', speciesId: 587, name: 'emolga', level: 30, requested: 'Boldore', conditions: [] },
  { locationId: 384, area: 'undella-town', speciesId: 446, name: 'munchlax', level: 60, requested: 'Cinccino', conditions: ['season-summer'] },
  { locationId: 370, area: 'unova-route-15', speciesId: 479, name: 'rotom', level: 60, requested: 'Ditto', conditions: [] },
]

export function withBlackNpcTrades(locationId: number, rows: readonly EncounterSpecies[]): EncounterSpecies[] {
  const result = rows.map(row => ({ ...row, details: row.details.map(detail => detail.method === 'npc-trade' ? { ...detail, chance: null } : detail) }))
  for (const trade of blackNpcTrades.filter(trade => trade.locationId === locationId)) {
    let row = result.find(row => row.speciesId === trade.speciesId)
    if (!row) { row = { speciesId: trade.speciesId, name: trade.name, details: [] }; result.push(row) }
    // Enrich the API's generic trade if present; keep all wild methods.
    row.details = row.details.filter(detail => detail.method !== 'npc-trade')
    row.details.push({ area: trade.area, method: 'npc-trade', minLevel: trade.level, maxLevel: trade.level, chance: null, conditions: trade.conditions, trade: { requested: trade.requested, instructionsKey: trade.name } })
  }
  return result.sort((a, b) => a.speciesId - b.speciesId)
}
