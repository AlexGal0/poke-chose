import type { CombatField, CombatPosition, CombatSideId, FieldPokemon } from '../games/core/combat.ts'

export function fieldSelectionId(side: CombatSideId, position: CombatPosition): string | null {
  return position.state === 'occupied' ? JSON.stringify([side, position.id, position.pokemon.ownerId, position.pokemon.identity, position.pokemon.speciesId, position.pokemon.form]) : null
}

export interface FieldComparisonOption {
  id: string
  position: number
  pokemon: FieldPokemon
}

export function fieldComparisonOptions(field: CombatField, sideId: CombatSideId): FieldComparisonOption[] {
  const side = field.sides.find(side => side.id === sideId)
  return side?.positions.flatMap((position, index) => position.state === 'occupied' ? [{ id: fieldSelectionId(sideId, position)!, position: index + 1, pokemon: position.pokemon }] : []) ?? []
}

export function resolveFieldComparison(options: readonly FieldComparisonOption[], selected: string | null) {
  return options.find(option => option.id === selected) ?? options[0] ?? null
}
