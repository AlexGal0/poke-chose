export interface EncounterLocation { id: number; name: string }
export interface EncounterDetail {
  area: string
  method: string
  minLevel: number
  maxLevel: number
  chance: number | null
  conditions: string[]
  instructionsKey?: string
  trade?: { requested: string; instructionsKey: string }
}
// Compatibility for the existing Black adapter; the encounter model is shared.
export type BlackEncounterDetail = EncounterDetail
export interface EncounterSpecies {
  speciesId: number
  name: string
  details: EncounterDetail[]
}
