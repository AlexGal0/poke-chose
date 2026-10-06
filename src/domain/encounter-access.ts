import type { EncounterSpecies } from '../models/encounters.ts'

export interface EncounterAccess { surf: boolean; superRod: boolean }

// BW aquatic methods, including rippling-water variants. Other methods retain
// their conditions: this filters equipment, not story progress or zone access.
export function accessibleEncounters(rows: EncounterSpecies[], access: EncounterAccess): EncounterSpecies[] {
  return rows.flatMap(row => {
    const details = row.details.filter(detail => {
      if (detail.method === 'surf' || detail.method === 'surf-spots') return access.surf
      if (detail.method === 'super-rod' || detail.method === 'super-rod-spots') return access.superRod
      return true
    })
    return details.length ? [{ ...row, details }] : []
  })
}
