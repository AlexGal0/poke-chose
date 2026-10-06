export interface EncounterLocation { id: number; name: string }
export interface BlackEncounterDetail {
  area: string
  method: string
  minLevel: number
  maxLevel: number
  chance: number | null
  conditions: string[]
  trade?: { requested: string; instructions: string }
}
export interface EncounterSpecies {
  speciesId: number
  name: string
  details: BlackEncounterDetail[]
}
