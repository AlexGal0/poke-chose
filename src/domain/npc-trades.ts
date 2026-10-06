import type { EncounterSpecies } from '../models/encounters.ts'

// Original Pokémon Black only. White and Black 2 trades are deliberately separate.
// https://www.wikidex.net/wiki/Lista_de_intercambios_Pok%C3%A9mon_de_los_videojuegos
export const blackNpcTrades = [
  { locationId: 349, area: 'nacrene-city', speciesId: 548, name: 'petilil', level: 15, requested: 'Cottonee', instructions: 'Habla con la chica en la planta superior de la casa de dos pisos junto al Centro Pokémon.', conditions: [] },
  { locationId: 352, area: 'driftveil-city', speciesId: 550, name: 'basculin', level: 25, requested: 'Minccino', instructions: 'Intercambio en una casa de Ciudad Fayenza. Recibes un Basculin de raya roja.', conditions: [] },
  { locationId: 362, area: 'unova-route-7', speciesId: 587, name: 'emolga', level: 30, requested: 'Boldore', instructions: 'Habla con el personaje que ofrece el intercambio en la casa de la Ruta 7.', conditions: [] },
  { locationId: 384, area: 'undella-town', speciesId: 446, name: 'munchlax', level: 60, requested: 'Cinccino', instructions: 'Intercambio en Pueblo Arenisca, solo durante el verano.', conditions: ['season-summer'] },
  { locationId: 370, area: 'unova-route-15', speciesId: 479, name: 'rotom', level: 60, requested: 'Ditto', instructions: 'Habla con la científica en la caravana de la Ruta 15.', conditions: [] },
]

export function withBlackNpcTrades(locationId: number, rows: readonly EncounterSpecies[]): EncounterSpecies[] {
  const result = rows.map(row => ({ ...row, details: row.details.map(detail => detail.method === 'npc-trade' ? { ...detail, chance: null } : detail) }))
  for (const trade of blackNpcTrades.filter(trade => trade.locationId === locationId)) {
    let row = result.find(row => row.speciesId === trade.speciesId)
    if (!row) { row = { speciesId: trade.speciesId, name: trade.name, details: [] }; result.push(row) }
    // Enrich the API's generic trade if present; keep all wild methods.
    row.details = row.details.filter(detail => detail.method !== 'npc-trade')
    row.details.push({ area: trade.area, method: 'npc-trade', minLevel: trade.level, maxLevel: trade.level, chance: null, conditions: trade.conditions, trade: { requested: trade.requested, instructions: trade.instructions } })
  }
  return result.sort((a, b) => a.speciesId - b.speciesId)
}
