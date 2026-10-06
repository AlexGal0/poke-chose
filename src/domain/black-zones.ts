import type { EncounterLocation } from '../models/encounters.ts'

// Spanish game names checked against WikiDex's Teselia and BW walkthrough.
// https://www.wikidex.net/wiki/Teselia
// https://www.wikidex.net/wiki/Guía_de_Pokémon_Negro_y_Pokémon_Blanco
// Order is a first-visit itinerary, not a claim that every detour is mandatory.
type Stage = 'Historia' | 'Opcionales' | 'Después de la Liga' | 'Otros lugares'
interface Zone { id: number; slug: string; label: string; stage: Stage }
const entries: [number, string, string, Stage?][] = [
  [346, 'nuvema-town', 'Pueblo Arcilla'],
  [356, 'unova-route-1', 'Ruta 1'],
  [347, 'accumula-town', 'Pueblo Terracota'],
  [357, 'unova-route-2', 'Ruta 2'],
  [348, 'striaton-city', 'Ciudad Gres'],
  [374, 'dreamyard', 'Solar de los Sueños'],
  [358, 'unova-route-3', 'Ruta 3'],
  [395, 'wellspring-cave', 'Cueva Manantial'],
  [349, 'nacrene-city', 'Ciudad Esmalte'],
  [375, 'pinwheel-forest', 'Bosque Azulejo'],
  [406, 'skyarrow-bridge', 'Puente Saeta'],
  [350, 'castelia-city', 'Ciudad Porcelana'],
  [359, 'unova-route-4', 'Ruta 4'],
  [376, 'desert-resort', 'Zona Desierto'],
  [377, 'relic-castle', 'Castillo Ancestral'],
  [351, 'nimbasa-city', 'Ciudad Mayólica'],
  [360, 'unova-route-5', 'Ruta 5'],
  [407, 'driftveil-drawbridge', 'Puente de Fayenza'],
  [352, 'driftveil-city', 'Ciudad Fayenza'],
  [378, 'cold-storage', 'Almacenes Frigoríficos'],
  [361, 'unova-route-6', 'Ruta 6'],
  [379, 'chargestone-cave', 'Cueva Electrorroca'],
  [353, 'mistralton-city', 'Ciudad Loza'],
  [362, 'unova-route-7', 'Ruta 7'],
  [398, 'celestial-tower', 'Torre de los Cielos'],
  [380, 'twist-mountain', 'Monte Tuerca'],
  [354, 'icirrus-city', 'Ciudad Teja'],
  [381, 'dragonspiral-tower', 'Torre Duodraco'],
  [363, 'unova-route-8', 'Ruta 8'],
  [399, 'moor-of-icirrus', 'Pantano Teja'],
  [408, 'tubeline-bridge', 'Puente Axial'],
  [364, 'unova-route-9', 'Ruta 9'],
  [400, 'unova-shopping-mall', 'Centro Comercial R9'],
  [355, 'opelucid-city', 'Ciudad Caolín'],
  [365, 'unova-route-10', 'Ruta 10'],
  [382, 'unova-victory-road', 'Calle Victoria'],
  [415, 'trial-chamber', 'Cámara de Pruebas'],
  [386, 'unova-pokemon-league', 'Liga Pokémon'],
  [387, 'ns-castle', 'Palacio de N'],
  [404, 'liberty-garden', 'Isla Libertad', 'Opcionales'],
  [394, 'unity-tower', 'Torre Unión', 'Opcionales'],
  [371, 'unova-route-16', 'Ruta 16', 'Opcionales'],
  [414, 'lostlorn-forest', 'Bosque Perdidos', 'Opcionales'],
  [396, 'mistralton-cave', 'Cueva Loza', 'Opcionales'],
  [416, 'guidance-chamber', 'Estancia Orientación', 'Opcionales'],
  [397, 'rumination-field', 'Claro Filosofía', 'Opcionales'],
  [372, 'unova-route-17', 'Ruta 17', 'Opcionales'],
  [373, 'unova-route-18', 'Ruta 18', 'Opcionales'],
  [405, 'p2-laboratory', 'Laboratorio P+P', 'Opcionales'],
  [401, 'challengers-cave', 'Gruta Superación', 'Después de la Liga'],
  [366, 'unova-route-11', 'Ruta 11', 'Después de la Liga'],
  [409, 'village-bridge', 'Puente Villa', 'Después de la Liga'],
  [367, 'unova-route-12', 'Ruta 12', 'Después de la Liga'],
  [383, 'lacunosa-town', 'Pueblo Ladrillo', 'Después de la Liga'],
  [368, 'unova-route-13', 'Ruta 13', 'Después de la Liga'],
  [403, 'giant-chasm', 'Boquete Gigante', 'Después de la Liga'],
  [384, 'undella-town', 'Pueblo Arenisca', 'Después de la Liga'],
  [413, 'undella-bay', 'Bahía Arenisca', 'Después de la Liga'],
  [428, 'abyssal-ruins', 'Ruinas Submarinas', 'Después de la Liga'],
  [369, 'unova-route-14', 'Ruta 14', 'Después de la Liga'],
  [412, 'abundant-shrine', 'Santuario Abundancia', 'Después de la Liga'],
  [392, 'black-city', 'Ciudad Negra', 'Después de la Liga'],
  [370, 'unova-route-15', 'Ruta 15', 'Después de la Liga'],
  [402, 'poke-transfer-lab', 'Laboratorio Transfer', 'Después de la Liga'],
  [410, 'marvelous-bridge', 'Puente Progreso', 'Después de la Liga'],
  [385, 'anville-town', 'Pueblo Biscuit', 'Otros lugares'],
  [388, 'royal-unova', 'Real Teselia', 'Otros lugares'],
  [389, 'gear-station', 'Terminal del Metro', 'Otros lugares'],
  [390, 'battle-subway', 'Metro Batalla', 'Otros lugares'],
  [391, 'musical-theater', 'Teatro Musical', 'Otros lugares'],
  [411, 'entralink', 'Zona Nexo', 'Otros lugares'],
  [417, 'entree-forest', 'Bosque Nexo', 'Otros lugares'],
  // Gate resources have no separate proper name: describe their official destination.
  [418, 'accumula-gate', 'Acceso: Pueblo Terracota', 'Otros lugares'],
  [419, 'undella-gate', 'Acceso: Pueblo Arenisca', 'Otros lugares'],
  [420, 'nacrene-gate', 'Acceso: Ciudad Esmalte', 'Otros lugares'],
  [421, 'castelia-gate', 'Acceso: Ciudad Porcelana', 'Otros lugares'],
  [422, 'nimbasa-gate', 'Acceso: Ciudad Mayólica', 'Otros lugares'],
  [423, 'opelucid-gate', 'Acceso: Ciudad Caolín', 'Otros lugares'],
  [424, 'black-gate', 'Acceso: Ciudad Negra', 'Otros lugares'],
  [426, 'bridge-gate', 'Acceso a puente', 'Otros lugares'],
  [427, 'route-gate', 'Acceso a ruta', 'Otros lugares'],
]
const zones: Zone[] = entries.map(([id, slug, label, stage = 'Historia']) => ({ id, slug, label, stage }))
const byId = new Map(zones.map((zone, order) => [zone.id, { ...zone, order }]))
export const ZONE_STAGES: Stage[] = ['Historia', 'Opcionales', 'Después de la Liga', 'Otros lugares']

export function zoneLabel(location: EncounterLocation): string {
  return byId.get(location.id)?.label ?? 'Zona sin nombre verificado'
}
export function zoneStage(location: EncounterLocation): Stage {
  return byId.get(location.id)?.stage ?? 'Otros lugares'
}
export function orderBlackZones(locations: EncounterLocation[]): EncounterLocation[] {
  return [...locations].sort((a, b) => (byId.get(a.id)?.order ?? Infinity) - (byId.get(b.id)?.order ?? Infinity) || a.id - b.id)
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
export function searchBlackZones(locations: EncounterLocation[], query: string): EncounterLocation[] {
  const words = normalize(query).split(/\s+/)
  return locations.filter(location => words.every(word => normalize(`${zoneLabel(location)} ${location.name} ${zoneStage(location)}`).includes(word)))
}
export function areaLabel(slug: string): string {
  const zone = zones.filter(row => slug === row.slug || slug.startsWith(`${row.slug}-`)).sort((a, b) => b.slug.length - a.slug.length)[0]
  if (!zone) return `Subzona · ${slug.replace(/-/g, ' ')}`
  const suffix = slug.slice(zone.slug.length)
  if (!suffix || suffix === '-area') return `${zone.label} · Zona principal`
  if (suffix === '-entrance') return `${zone.label} · Entrada`
  const floor = /(?:^|-)(b?\d+)f(?:-|$)/.exec(suffix)
  const level = floor ? floor[1].startsWith('b') ? ` · Sótano ${floor[1].slice(1)}` : ` · Planta ${floor[1]}` : ''
  const side = suffix.includes('outside') ? ' · Exterior' : suffix.includes('inside') ? ' · Interior' : ''
  return `${zone.label}${level}${side}${!level && !side ? ` · ${suffix.slice(1).replace(/-/g, ' ')}` : ''}`
}
