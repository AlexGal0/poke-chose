import { xGenderDistribution } from './gender.ts'
import snapshot from './data/encounters.json' with { type: 'json' }
import localities from './data/locations.json' with { type: 'json' }
import specialSpecies from './data/special-species.json' with { type: 'json' }
import type { EncounterAtlasData } from '../core/encounters'

// Travel order belongs to the game adapter, never to the atlas component.
export const xRouteOrder = [587, 588, 590, 591, 593, 594, 596, 655, 597, 599, 602, 604, 605, 606, 608, 609, 1121, 617, 672, 612, 614, 615, 671, 611, 618, 620, 621, 623, 624, 625, 626, 628, 661, 629, 674, 600, 631, 633, 634, 635, 677, 638, 637, 640, 641, 643, 601, 675, 644, 676, 646, 647, 649, 650, 652, 653, 678, 657, 658, 659, 660, 679, 690, 680, 1056]

// Fixed NPC trades, separate from random encounter tables. Sources and notes:
// https://www.serebii.net/xy/ingametrade.shtml
const trades = [
  { zone: 596, speciesId: 83, requested: 'bunnelby', level: 10, note: 'santalune' },
  { zone: 611, speciesId: 208, requested: 'luvdisc', level: 20, note: 'cyllage' },
  { zone: 649, speciesId: 625, requested: 'jigglypuff', level: 50, note: 'snowbelle' },
  { zone: 599, speciesId: 280, requested: 'any', level: 5, note: 'diantha' },
  ...[650, 653, 656].map(speciesId => ({ zone: 587, speciesId, requested: 'any', level: 5, note: `shauna-${speciesId}` })),
  { zone: 2000001, speciesId: 129, requested: 'gyarados', level: 5, note: 'hotelMagikarp' },
  { zone: 2000001, speciesId: 133, requested: 'any', level: 5, note: 'hotelEevee' },
]
const giftNotes: Record<number, string> = { 590: 'kalosStarter', 599: 'kantoStarter', 625: 'lucario', 626: 'lapras', 671: 'fossil' }
const hotel = { id: 2000001, name: 'kalos-hotels', names: { es: 'Kalos · hoteles (personajes itinerantes)', en: 'Kalos · hotels (traveling NPCs)' }, areas: [] }
const locations = [...xRouteOrder, hotel.id].map(id => {
  const source = snapshot.locations.find(zone => zone.id === id) ?? localities.find(zone => zone.id === id) ?? (id === hotel.id ? hotel : undefined)
  if (!source) throw new Error(`Missing X locality: ${id}`)
  const zone = structuredClone(source) as EncounterAtlasData['locations'][number]
  for (const area of zone.areas) for (const row of area.rows) for (const detail of row.details) {
    if (detail.method === 'gift') {
      detail.chance = null
      detail.instructionsKey = `encounterAtlas.specialNotes.${giftNotes[id]}`
    }
  }
  const rows = trades.filter(trade => trade.zone === id).map(trade => {
    const pokemon = [...snapshot.species, ...specialSpecies].find(species => species.id === trade.speciesId)
    if (!pokemon) throw new Error(`Missing X trade species: ${trade.speciesId}`)
    return { speciesId: pokemon.id, name: pokemon.name, variety: pokemon.name, details: [{ area: `${zone.name}-trades`, method: 'npc-trade', minLevel: trade.level, maxLevel: trade.level, chance: null, conditions: [], trade: { requested: trade.requested, instructionsKey: `encounterAtlas.specialNotes.${trade.note}` } }] }
  })
  if (rows.length) zone.areas.push({ name: `${zone.name}-trades`, names: {}, rows })
  return zone
})
// Journey sections follow this adapter's established itinerary, not Black's badge IDs.
const sectionStarts = [587, 655, 618, 626, 629, 675, 658, hotel.id]
const groupedLocations = locations.map((zone, index) => {
  const section = sectionStarts.findLastIndex(id => index >= locations.findIndex(location => location.id === id))
  const start = locations.findIndex(location => location.id === sectionStarts[section])
  const end = section + 1 < sectionStarts.length ? locations.findIndex(location => location.id === sectionStarts[section + 1]) - 1 : locations.length - 1
  const first = locations[start]
  const last = locations[end]
  const endpointName = (zone: typeof first, locale: 'es' | 'en') => zone.names[locale] ?? (zone.name === 'roaming-kalos' ? { es: 'Kalos · encuentros errantes', en: 'Kalos · roaming encounters' }[locale] : zone.name)
  return { ...zone, stage: { name: `journey-section-${section}`, names: Object.fromEntries(['es', 'en'].map(locale => [locale, first === last ? endpointName(first, locale as 'es' | 'en') : `${endpointName(first, locale as 'es' | 'en')} → ${endpointName(last, locale as 'es' | 'en')}`])) } }
})
export const xEncounters: EncounterAtlasData = {
  extraSources: [{ label: 'Serebii · NPC trades', url: 'https://www.serebii.net/xy/ingametrade.shtml' }, { label: 'Serebii · Gift Pokémon', url: 'https://www.serebii.net/xy/gift.shtml' }],
  equipmentMethods: ['surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash'],
  ...snapshot,
  species: [...snapshot.species, ...specialSpecies.filter(species => !snapshot.species.some(existing => existing.id === species.id))].map(species => ({ ...species, genderDistribution: xGenderDistribution(species.genderRate) })),
  locations: groupedLocations.map(zone => ({ ...zone,
    ...(zone.name === 'friend-safari' ? { noticeKey: 'encounterAtlas.safariHint' } : {}),
  })),
}
