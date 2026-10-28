import { GENERAL_COMBAT_POSITIONS } from '../games/core/combat.ts'
import type { CombatField } from '../games/core/combat.ts'

// Checks normalized topology only. Species, forms and party limits belong to
// each game's adapter; special formats supply their own additional rules.
export function validCombatField(field: CombatField): boolean {
  if (field.sides[0].id !== 'player' || field.sides[1].id !== 'opponent') return false
  const format = field.format.state === 'known' ? field.format.value : null
  if (format?.kind === 'special' && (!format.gameId.trim() || !format.id.trim())) return false
  const capacity = format?.kind === 'general' ? GENERAL_COMBAT_POSITIONS[format.id] : null
  return field.sides.every((side, sideIndex) => {
    if (capacity && side.positions.length !== capacity[sideIndex]) return false
    const owners = new Set(side.owners.map(owner => owner.id))
    if (owners.size !== side.owners.length || side.owners.some(owner => !owner.id.trim() ||
      (side.id === 'player' ? !['player', 'ally'].includes(owner.control) : !['opponent', 'wild'].includes(owner.control)))) return false
    const positions = new Set(side.positions.map(position => position.id))
    if (positions.size !== side.positions.length || side.positions.some(position => !position.id.trim())) return false
    const identities = new Set<string>()
    let occupied = 0
    for (const position of side.positions) {
      if (position.state !== 'occupied') continue
      const pokemon = position.pokemon
      if (!owners.has(pokemon.ownerId) || !pokemon.identity.trim() || pokemon.isEgg || identities.has(pokemon.identity) ||
        (pokemon.partySlot !== null && (!Number.isInteger(pokemon.partySlot) || pokemon.partySlot < 0))) return false
      identities.add(pokemon.identity)
      occupied++
    }
    const total = side.rosterTotal
    return total.state === 'unknown' || (Number.isInteger(total.value) && total.value >= occupied)
  })
}
