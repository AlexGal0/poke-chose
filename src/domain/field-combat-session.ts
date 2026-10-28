import type { CombatField, CombatFormat, CombatPosition, CombatSide, FieldCombatReading, FieldPokemon } from '../games/core/combat.ts'
import { validCombatField } from './combat-field.ts'

export interface FieldCombatSession {
  inBattle: boolean
  field: CombatField | null
  playerTeam: readonly FieldPokemon[] | null
  // Changes on a confirmed new battle or format, so UI selections cannot leak.
  revision: number
  stale: boolean
}

export function emptyFieldCombatSession(): FieldCombatSession {
  return { inBattle: false, field: null, playerTeam: null, revision: 0, stale: false }
}

function samePokemon(a: FieldPokemon, b: FieldPokemon) {
  return a.ownerId === b.ownerId && a.identity === b.identity && a.speciesId === b.speciesId && a.form === b.form
}

function sameFormat(a: CombatFormat, b: CombatFormat) {
  return a.kind === b.kind && a.id === b.id && (a.kind !== 'special' || b.kind === 'special' && a.gameId === b.gameId)
}

function retainPokemon(previous: FieldPokemon | undefined, next: FieldPokemon): FieldPokemon {
  return previous ? { ...next, ...(next.nickname === undefined && previous.nickname !== undefined ? { nickname: previous.nickname } : {}), level: next.level ?? previous.level, partySlot: next.partySlot ?? previous.partySlot, health: next.health ?? previous.health, stages: next.stages ?? previous.stages } : next
}

function mergeTeam(previous: readonly FieldPokemon[] | null, next: readonly FieldPokemon[] | null | undefined, field: CombatField): readonly FieldPokemon[] | null {
  const team = next?.map(pokemon => retainPokemon(previous?.find(old => samePokemon(old, pokemon)), pokemon)) ?? previous
  if (!team) return null
  const controlled = field.sides[0].owners.filter(owner => owner.control === 'player').map(owner => owner.id)
  const active = field.sides[0].positions.flatMap(position => position.state === 'occupied' ? [position.pokemon] : [])
  return team.filter(pokemon => controlled.includes(pokemon.ownerId)).map(pokemon => {
    const current = active.find(candidate => samePokemon(candidate, pokemon))
    return current ? retainPokemon(pokemon, current) : pokemon
  })
}

function mergeSide(previous: CombatSide, next: CombatSide): CombatSide {
  const sameOwners = next.owners.length === previous.owners.length && next.owners.every(owner => previous.owners.some(old => old.id === owner.id && old.control === owner.control))
  const confirmed = next.positions.flatMap(position => position.state === 'occupied' ? [position.pokemon] : [])
  const positions: CombatPosition[] = next.positions.map(position => {
    const old = previous.positions.find(candidate => candidate.id === position.id)
    if (position.state === 'empty') return position
    if (position.state === 'unknown') {
      if (old?.state === 'empty' && sameOwners) return old
      if (old?.state !== 'occupied') return position
      const owner = next.owners.find(candidate => candidate.id === old.pokemon.ownerId)
      const oldOwner = previous.owners.find(candidate => candidate.id === old.pokemon.ownerId)
      // A known move to another position must not create a duplicate occupant.
      return owner?.control === oldOwner?.control && owner && !confirmed.some(pokemon => pokemon.ownerId === old.pokemon.ownerId && pokemon.identity === old.pokemon.identity) ? old : position
    }
    const match = previous.positions.find(candidate => candidate.state === 'occupied' && samePokemon(candidate.pokemon, position.pokemon))
    if (match?.state !== 'occupied') return position
    return { ...position, pokemon: retainPokemon(match.pokemon, position.pokemon) }
  })
  const total = next.rosterTotal.state === 'known' || !sameOwners ? next.rosterTotal : previous.rosterTotal
  const occupied = positions.filter(position => position.state === 'occupied').length
  return { ...next, positions, rosterTotal: total.state === 'known' && total.value < occupied ? { state: 'unknown' } : total }
}

function partial(field: CombatField) {
  return field.format.state === 'unknown' || field.sides.some(side => side.rosterTotal.state === 'unknown' || side.positions.some(position => position.state === 'unknown' || position.state === 'occupied' && (position.pokemon.level === null || !position.pokemon.health || !position.pokemon.stages)))
}

export function advanceFieldCombatSession(previous: FieldCombatSession, reading: FieldCombatReading): FieldCombatSession {
  if (reading.status !== 'ready') return { ...previous, stale: previous.inBattle }
  if (reading.activity === 'inactive') return { ...emptyFieldCombatSession(), revision: previous.revision }
  if (!previous.inBattle && reading.activity !== 'active') return previous
  const next = reading.field
  if (!next || !validCombatField(next)) return { ...previous, stale: true }
  const old = previous.field
  const changedFormat = old?.format.state === 'known' && next.format.state === 'known' && !sameFormat(old.format.value, next.format.value)
  if (!old || changedFormat) return { inBattle: true, field: next, playerTeam: mergeTeam(null, reading.playerTeam, next), revision: previous.revision + 1, stale: reading.activity === 'unknown' || partial(next) }
  const field: CombatField = {
    format: next.format.state === 'known' ? next.format : old.format,
    sides: [mergeSide(old.sides[0], next.sides[0]) as CombatField['sides'][0], mergeSide(old.sides[1], next.sides[1]) as CombatField['sides'][1]],
  }
  // Conflicting partial topology must not turn the last confirmed format into
  // an invalid field, or combine counts from unrelated teams.
  if (!validCombatField(field)) return { ...previous, stale: true }
  return { ...previous, inBattle: true, field, playerTeam: mergeTeam(previous.playerTeam, reading.playerTeam, field), stale: reading.activity === 'unknown' || partial(next) || previous.playerTeam !== null && reading.playerTeam == null }
}
