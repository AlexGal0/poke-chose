// Normalized acquisition data. Adapters own game rules, sources and labels.
export type AcquisitionText = { text: string } | { key: string; params?: Record<string, string | number | boolean | AcquisitionText> }
export interface AcquisitionRoute { kind: string; icon: string; label: AcquisitionText }
export interface AcquisitionInstruction { label: AcquisitionText; source: string }
export interface AcquisitionMethod {
  id: string; icon: string; label: AcquisitionText
  encounters: { minLevel: number; maxLevel: number; chance: number | null; conditions: AcquisitionText[] }[]
}
export interface AcquisitionZone {
  id: string; label: AcquisitionText
  areas: { id: string; label?: AcquisitionText; methods: AcquisitionMethod[] }[]
}
export interface AcquisitionDetails {
  routes: readonly AcquisitionRoute[]
  zones: readonly AcquisitionZone[]
  trades: readonly { id: string; location: AcquisitionText; instructions: AcquisitionText; requested: string | AcquisitionText }[]
  evolution: { from: string; methods: AcquisitionText[][] } | null
}
export interface AcquisitionService {
  id: string
  gameName: string
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
