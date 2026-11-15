import data from './data/mega-evolutions.json' with { type: 'json' }

interface BattleIdentity { speciesId: number; form: number; heldItemId?: number | null }

// The immutable PK6 identity is checked by the caller. Mega Evolution changes
// only the battle form; the saved/overworld party retains its ordinary form.
export function xyBattleFormMatches(roster: BattleIdentity, active: BattleIdentity): boolean {
  if (roster.speciesId !== active.speciesId) return false
  if (roster.form === active.form) return true
  return roster.form === 0 && roster.heldItemId === active.heldItemId && data.entries.some(entry =>
    entry.speciesId === active.speciesId && (entry.variant === 'Y' ? 2 : 1) === active.form && Number(entry.inventoryKey) === active.heldItemId)
}
