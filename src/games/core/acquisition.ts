// Normalized acquisition data. Adapters own game rules, sources and labels.
export type AcquisitionText = { text: string } | { key: string; params?: Record<string, string | number | boolean | AcquisitionText> }
// Omitted access is unverified, never evidence of independent acquisition.
export type AcquisitionAccess = 'independent' | 'trade' | 'event' | 'external' | 'unknown'
export interface AcquisitionRoute { kind: string; icon: string; label: AcquisitionText; access?: AcquisitionAccess }
export type IndependentAvailability = 'obtainable' | 'unobtainable' | 'unknown'
export interface AcquisitionAvailability {
  // Includes complete prerequisites: parents, pre-evolutions, items and NPC trades.
  independent: IndependentAvailability
  // null means the game has no counterpart; unknown means it has not been checked.
  counterpart: { gameId: string; gameName: AcquisitionText; independent: IndependentAvailability } | null
}

// Only a confirmed difference establishes exclusivity, relative to this counterpart.
export function isCounterpartExclusive(availability: AcquisitionAvailability): boolean {
  return availability.independent === 'obtainable' && availability.counterpart?.independent === 'unobtainable'
}

export function matchesExclusiveSpecies(speciesId: number, onlyExclusive: boolean, exclusiveSpeciesIds?: readonly number[]): boolean {
  return !onlyExclusive || exclusiveSpeciesIds === undefined || exclusiveSpeciesIds.includes(speciesId)
}

// External routes remain in details, but only trades and events may be advertised.
// Legacy routes are unverified until their adapter supplies access explicitly.
export function summaryAcquisitionRoutes(routes: readonly AcquisitionRoute[]): readonly AcquisitionRoute[] {
  return routes.filter(route => route.access === 'independent' || route.access === 'trade' || route.access === 'event')
}
export interface AcquisitionInstruction { label: AcquisitionText; source: string }
export interface AcquisitionMethod {
  id: string; icon: string; label: AcquisitionText
  access?: AcquisitionAccess
  encounters: { minLevel: number; maxLevel: number; chance: number | null; conditions: AcquisitionText[] }[]
}
export interface AcquisitionZone {
  id: string; label: AcquisitionText
  areas: { id: string; label?: AcquisitionText; methods: AcquisitionMethod[] }[]
}
export interface AcquisitionDetails {
  availability?: AcquisitionAvailability
  routes: readonly AcquisitionRoute[]
  zones: readonly AcquisitionZone[]
  trades: readonly { id: string; location: AcquisitionText; instructions: AcquisitionText; requested: string | AcquisitionText }[]
  evolution: { from: string; methods: AcquisitionText[][] } | null
}
export interface AcquisitionService {
  id: string
  gameName: string
  // Complete, confirmed species list for filtering before catalog pagination.
  // Undefined means unsupported; an empty list means no independent exclusives.
  exclusiveSpeciesIds?: readonly number[]
  // Optional during adapter migration. Missing information stays unconfirmed.
  availability?(speciesId: number, signal?: AbortSignal): Promise<AcquisitionAvailability>
  labels: { group: AcquisitionText; open: AcquisitionText; hint: AcquisitionText; loading: AcquisitionText; noEncounters: AcquisitionText }
  breedingOnly?(speciesId: number, signal?: AbortSignal): Promise<boolean>
  instructions(speciesId: number): readonly AcquisitionInstruction[]
  routes(speciesId: number, signal?: AbortSignal): Promise<readonly AcquisitionRoute[]>
  details(speciesId: number, locale: string, signal?: AbortSignal): Promise<AcquisitionDetails>
}

// Local acquisition according to this adapter's sources; not player-to-player trades.
export function localBreedingOnly(kinds: readonly string[], baby = false): boolean {
  return (baby || kinds.includes('breed')) && !['capture', 'static', 'gift', 'egg', 'fossil', 'npc-trade'].some(kind => kinds.includes(kind))
}
