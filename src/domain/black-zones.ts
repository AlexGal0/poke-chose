import type { EncounterLocation } from '../models/encounters.ts'

// Checked against WikiDex's Teselia and BW walkthrough for the first-visit itinerary.
// https://www.wikidex.net/wiki/Teselia
// https://www.wikidex.net/wiki/Guía_de_Pokémon_Negro_y_Pokémon_Blanco
// Order is a first-visit itinerary, not a claim that every detour is mandatory.
// Labels live in the zones.* translation keys, keyed by slug; this file only
// carries IDs, slugs and stage membership so it stays locale-free.
export type ZoneStage = 'story' | 'optional' | 'postLeague' | 'other'
interface Zone { id: number; slug: string; stage: ZoneStage }
const entries: [number, string, ZoneStage?][] = [
  [346, 'nuvema-town'],
  [356, 'unova-route-1'],
  [347, 'accumula-town'],
  [357, 'unova-route-2'],
  [348, 'striaton-city'],
  [374, 'dreamyard'],
  [358, 'unova-route-3'],
  [395, 'wellspring-cave'],
  [349, 'nacrene-city'],
  [375, 'pinwheel-forest'],
  [406, 'skyarrow-bridge'],
  [350, 'castelia-city'],
  [359, 'unova-route-4'],
  [376, 'desert-resort'],
  [377, 'relic-castle'],
  [351, 'nimbasa-city'],
  [360, 'unova-route-5'],
  [407, 'driftveil-drawbridge'],
  [352, 'driftveil-city'],
  [378, 'cold-storage'],
  [361, 'unova-route-6'],
  [379, 'chargestone-cave'],
  [353, 'mistralton-city'],
  [362, 'unova-route-7'],
  [398, 'celestial-tower'],
  [380, 'twist-mountain'],
  [354, 'icirrus-city'],
  [381, 'dragonspiral-tower'],
  [363, 'unova-route-8'],
  [399, 'moor-of-icirrus'],
  [408, 'tubeline-bridge'],
  [364, 'unova-route-9'],
  [400, 'unova-shopping-mall'],
  [355, 'opelucid-city'],
  [365, 'unova-route-10'],
  [382, 'unova-victory-road'],
  [415, 'trial-chamber'],
  [386, 'unova-pokemon-league'],
  [387, 'ns-castle'],
  [404, 'liberty-garden', 'optional'],
  [394, 'unity-tower', 'optional'],
  [371, 'unova-route-16', 'optional'],
  [414, 'lostlorn-forest', 'optional'],
  [396, 'mistralton-cave', 'optional'],
  [416, 'guidance-chamber', 'optional'],
  [397, 'rumination-field', 'optional'],
  [372, 'unova-route-17', 'optional'],
  [373, 'unova-route-18', 'optional'],
  [405, 'p2-laboratory', 'optional'],
  [401, 'challengers-cave', 'postLeague'],
  [366, 'unova-route-11', 'postLeague'],
  [409, 'village-bridge', 'postLeague'],
  [367, 'unova-route-12', 'postLeague'],
  [383, 'lacunosa-town', 'postLeague'],
  [368, 'unova-route-13', 'postLeague'],
  [403, 'giant-chasm', 'postLeague'],
  [384, 'undella-town', 'postLeague'],
  [413, 'undella-bay', 'postLeague'],
  [428, 'abyssal-ruins', 'postLeague'],
  [369, 'unova-route-14', 'postLeague'],
  [412, 'abundant-shrine', 'postLeague'],
  [392, 'black-city', 'postLeague'],
  [370, 'unova-route-15', 'postLeague'],
  [402, 'poke-transfer-lab', 'postLeague'],
  [410, 'marvelous-bridge', 'postLeague'],
  [385, 'anville-town', 'other'],
  [388, 'royal-unova', 'other'],
  [389, 'gear-station', 'other'],
  [390, 'battle-subway', 'other'],
  [391, 'musical-theater', 'other'],
  [411, 'entralink', 'other'],
  [417, 'entree-forest', 'other'],
  // Gate resources have no separate proper name: describe their official destination.
  [418, 'accumula-gate', 'other'],
  [419, 'undella-gate', 'other'],
  [420, 'nacrene-gate', 'other'],
  [421, 'castelia-gate', 'other'],
  [422, 'nimbasa-gate', 'other'],
  [423, 'opelucid-gate', 'other'],
  [424, 'black-gate', 'other'],
  [426, 'bridge-gate', 'other'],
  [427, 'route-gate', 'other'],
]
const zones: Zone[] = entries.map(([id, slug, stage = 'story']) => ({ id, slug, stage }))

export function blackZoneLocations(): EncounterLocation[] {
  return zones.map(zone => ({ id: zone.id, name: zone.slug }))
}
const byId = new Map(zones.map((zone, order) => [zone.id, { ...zone, order }]))
export const ZONE_STAGES: ZoneStage[] = ['story', 'optional', 'postLeague', 'other']

export function zoneSlug(location: EncounterLocation): string | null {
  return byId.get(location.id)?.slug ?? null
}
export function zoneStage(location: EncounterLocation): ZoneStage {
  return byId.get(location.id)?.stage ?? 'other'
}
export function orderBlackZones(locations: EncounterLocation[]): EncounterLocation[] {
  return [...locations].sort((a, b) => (byId.get(a.id)?.order ?? Infinity) - (byId.get(b.id)?.order ?? Infinity) || a.id - b.id)
}
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
export function searchBlackZones(locations: EncounterLocation[], query: string, searchText: (location: EncounterLocation) => string): EncounterLocation[] {
  const words = normalize(query).split(/\s+/)
  return locations.filter(location => words.every(word => normalize(searchText(location)).includes(word)))
}

export type AreaDescriptor =
  | { kind: 'unknown'; raw: string }
  | { kind: 'main'; zoneSlug: string }
  | { kind: 'entrance'; zoneSlug: string }
  | { kind: 'basement'; zoneSlug: string; level: string }
  | { kind: 'floor'; zoneSlug: string; level: string }
  | { kind: 'outside'; zoneSlug: string }
  | { kind: 'inside'; zoneSlug: string }
  | { kind: 'suffix'; zoneSlug: string; suffix: string }

export function areaDescriptor(slug: string): AreaDescriptor {
  const zone = zones.filter(row => slug === row.slug || slug.startsWith(`${row.slug}-`)).sort((a, b) => b.slug.length - a.slug.length)[0]
  if (!zone) return { kind: 'unknown', raw: slug.replace(/-/g, ' ') }
  const suffix = slug.slice(zone.slug.length)
  if (!suffix || suffix === '-area') return { kind: 'main', zoneSlug: zone.slug }
  if (suffix === '-entrance') return { kind: 'entrance', zoneSlug: zone.slug }
  const floor = /(?:^|-)(b?\d+)f(?:-|$)/.exec(suffix)
  if (floor) return floor[1].startsWith('b') ? { kind: 'basement', zoneSlug: zone.slug, level: floor[1].slice(1) } : { kind: 'floor', zoneSlug: zone.slug, level: floor[1] }
  if (suffix.includes('outside')) return { kind: 'outside', zoneSlug: zone.slug }
  if (suffix.includes('inside')) return { kind: 'inside', zoneSlug: zone.slug }
  return { kind: 'suffix', zoneSlug: zone.slug, suffix: suffix.slice(1).replace(/-/g, ' ') }
}
