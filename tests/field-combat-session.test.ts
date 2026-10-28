import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceFieldCombatSession, emptyFieldCombatSession } from '../src/domain/field-combat-session.ts'
import { fieldComparisonOptions, resolveFieldComparison } from '../src/domain/field-combat-comparison.ts'
import type { CombatField, CombatPosition, FieldCombatReading, FieldPokemon } from '../src/games/core/combat.ts'

type MutableField = Omit<CombatField, 'sides'> & { sides: [
  Omit<CombatField['sides'][0], 'positions'> & { positions: CombatPosition[] },
  Omit<CombatField['sides'][1], 'positions'> & { positions: CombatPosition[] },
] }

function pokemon(identity: string, ownerId: string, speciesId = 316): FieldPokemon {
  return { identity, ownerId, speciesId, form: 0, level: 5, partySlot: 0, health: { currentHp: 21, maxHp: 21 }, stages: { attack: 2, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 } }
}
function field(format: 'single' | 'double' | 'horde' = 'double'): MutableField {
  const counts = format === 'single' ? [1, 1] : format === 'double' ? [2, 2] : [1, 5]
  return {
    format: { state: 'known', value: { kind: 'general', id: format } },
    sides: [
      { id: 'player', owners: [{ id: 'p', control: 'player' }], rosterTotal: { state: 'known', value: 6 }, positions: Array.from({ length: counts[0] }, (_, i) => ({ id: `p${i}`, state: 'occupied', pokemon: pokemon(`own${i}`, 'p', i ? 619 : 372) })) },
      { id: 'opponent', owners: [{ id: 'e', control: 'opponent' }], rosterTotal: { state: 'known', value: 6 }, positions: Array.from({ length: counts[1] }, (_, i) => ({ id: `e${i}`, state: 'occupied', pokemon: pokemon(`enemy${i}`, 'e') })) },
    ],
  }
}
const reading = (value: CombatField): FieldCombatReading => ({ status: 'ready', activity: 'active', field: value, messageCode: null })
const start = (value = field()) => advanceFieldCombatSession(emptyFieldCombatSession(), reading(value))
const unknown: FieldCombatReading = { status: 'ready', activity: 'unknown', field: null, messageCode: null }

test('only confirmed activity starts a session, errors preserve it, and confirmed exit clears every field', () => {
  const empty = emptyFieldCombatSession()
  assert.equal(advanceFieldCombatSession(empty, { ...unknown, field: field() }).inBattle, false)
  let session = start()
  const original = session.field
  for (let i = 0; i < 30; i++) session = advanceFieldCombatSession(session, unknown)
  assert.equal(session.field, original)
  assert.equal(session.stale, true)
  session = advanceFieldCombatSession(session, { status: 'error', activity: 'inactive', field: null, messageCode: null })
  assert.equal(session.inBattle, true)
  session = advanceFieldCombatSession(session, { status: 'ready', activity: 'inactive', field: null, messageCode: null })
  assert.equal(session.field, null)
  assert.equal(session.inBattle, false)
  const fresh = field()
  fresh.sides[1].rosterTotal = { state: 'unknown' }
  fresh.sides[1].positions[0] = { id: 'e0', state: 'unknown' }
  const restarted = advanceFieldCombatSession(session, reading(fresh))
  assert.equal(restarted.revision, session.revision + 1)
  assert.equal(restarted.field?.sides[1].positions[0].state, 'unknown')
  assert.deepEqual(restarted.field?.sides[1].rosterTotal, { state: 'unknown' })
})

test('unknown slots and values retain confirmed data; empty slots and replacements never inherit it', () => {
  const initial = start()
  const next = field()
  next.format = { state: 'unknown' }
  next.sides[1].rosterTotal = { state: 'unknown' }
  next.sides[1].positions[0] = { id: 'e0', state: 'unknown' }
  const own = next.sides[0].positions[0]
  if (own.state === 'occupied') { own.pokemon.health = null; own.pokemon.stages = null }
  const partial = advanceFieldCombatSession(initial, reading(next))
  assert.deepEqual(partial.field, initial.field)
  assert.equal(partial.stale, true)
  const replacement = field()
  replacement.sides[1].positions[0] = { id: 'e0', state: 'empty' }
  replacement.sides[1].positions[1] = { id: 'e1', state: 'occupied', pokemon: { ...pokemon('replacement', 'e'), health: null, stages: null } }
  const result = advanceFieldCombatSession(partial, reading(replacement))
  assert.equal(result.field?.sides[1].positions[0].state, 'empty')
  const occupant = result.field?.sides[1].positions[1]
  assert.equal(occupant?.state === 'occupied' ? occupant.pokemon.health : 'missing', null)
})

test('moving an occupant keeps its data without cloning it in an unknown former position', () => {
  const next = field()
  next.sides[1].positions[0] = { id: 'e0', state: 'unknown' }
  next.sides[1].positions[1] = { id: 'e1', state: 'occupied', pokemon: { ...pokemon('enemy0', 'e'), health: null, stages: null } }
  const session = advanceFieldCombatSession(start(), reading(next))
  assert.equal(session.field?.sides[1].positions[0].state, 'unknown')
  const moved = session.field?.sides[1].positions[1]
  assert.equal(moved?.state === 'occupied' ? moved.pokemon.health?.currentHp : null, 21)
})

test('species, form and owner changes cannot inherit health or stages even with a reused identity', () => {
  for (const change of [{ speciesId: 619 }, { form: 1 }, { ownerId: 'new-owner' }]) {
    const next = field()
    next.sides[1].owners = [...next.sides[1].owners, { id: 'new-owner', control: 'opponent' }]
    next.sides[1].positions[0] = { id: 'e0', state: 'occupied', pokemon: { ...pokemon('enemy0', 'e'), ...change, health: null, stages: null } }
    const snapshot = structuredClone(next)
    const result = advanceFieldCombatSession(start(), reading(next))
    const position = result.field?.sides[1].positions[0]
    assert.equal(position?.state === 'occupied' ? position.pokemon.health : 'missing', null)
    assert.equal(position?.state === 'occupied' ? position.pokemon.stages : 'missing', null)
    assert.deepEqual(next, snapshot, 'merging must not mutate the reader snapshot')
  }
})

test('fainting preserves horde format, positions and roster; a confirmed format change resets missing data', () => {
  const next = field('horde')
  const fainted = next.sides[1].positions[0]
  if (fainted.state === 'occupied') fainted.pokemon.health!.currentHp = 0
  let session = advanceFieldCombatSession(start(field('horde')), reading(next))
  assert.equal(session.field?.sides[1].positions.length, 5)
  assert.deepEqual(session.field?.format, next.format)
  assert.deepEqual(session.field?.sides[1].rosterTotal, { state: 'known', value: 6 })
  const single = field('single')
  single.sides[1].positions[0] = { id: 'e0', state: 'unknown' }
  single.sides[1].rosterTotal = { state: 'unknown' }
  const revision = session.revision
  session = advanceFieldCombatSession(session, reading(single))
  assert.equal(session.revision, revision + 1)
  assert.deepEqual(session.field, single)
})

test('corrupt fields and incompatible unknown topology cannot replace confirmed data', () => {
  const original = start()
  const corrupt = field()
  corrupt.sides[1].positions[1] = corrupt.sides[1].positions[0]
  assert.equal(advanceFieldCombatSession(original, reading(corrupt)).field, original.field)
  const incompatible = field('horde')
  incompatible.format = { state: 'unknown' }
  assert.equal(advanceFieldCombatSession(original, reading(incompatible)).field, original.field)
})

test('a retained total conflicting with newly confirmed occupants becomes unknown instead of blocking updates', () => {
  const initial = field('horde')
  initial.sides[1].positions = initial.sides[1].positions.map((position, i) => i > 1 ? { id: position.id, state: 'unknown' } : position)
  initial.sides[1].rosterTotal = { state: 'known', value: 2 }
  const next = field('horde')
  next.sides[1].rosterTotal = { state: 'unknown' }
  const result = advanceFieldCombatSession(start(initial), reading(next))
  assert.equal(result.field?.sides[1].positions.filter(position => position.state === 'occupied').length, 5)
  assert.deepEqual(result.field?.sides[1].rosterTotal, { state: 'unknown' })
})

test('comparison selects one explicit participant on each side and clears unavailable or replaced choices', () => {
  const initial = field()
  const own = fieldComparisonOptions(initial, 'player'), enemy = fieldComparisonOptions(initial, 'opponent')
  assert.equal(resolveFieldComparison(own, null)?.pokemon.identity, 'own0')
  assert.equal(resolveFieldComparison(enemy, enemy[1].id)?.pokemon.identity, 'enemy1')
  const changed = field()
  changed.sides[1].positions[1] = { id: 'e1', state: 'occupied', pokemon: pokemon('replacement', 'e', 619) }
  assert.equal(resolveFieldComparison(fieldComparisonOptions(changed, 'opponent'), enemy[1].id)?.pokemon.identity, 'enemy0')
  changed.sides[1].positions = changed.sides[1].positions.map(position => ({ id: position.id, state: 'unknown' }))
  assert.equal(resolveFieldComparison(fieldComparisonOptions(changed, 'opponent'), enemy[1].id), null)
  const mirrored = fieldComparisonOptions(initial, 'player')[0]
  assert.notEqual(mirrored.id, enemy[0].id)
})

test('controlled roster survives read gaps, tracks both actives and clears reserves on exit', () => {
  const initial = field()
  const roster = [pokemon('own0', 'p', 372), pokemon('own1', 'p', 619), { ...pokemon('reserve', 'p', 316), partySlot: 2 }, { ...pokemon('egg', 'p'), partySlot: 3, isEgg: true }]
  let session = advanceFieldCombatSession(emptyFieldCombatSession(), { ...reading(initial), playerTeam: roster })
  assert.equal(session.playerTeam?.length, 4)
  const next = field()
  const active = next.sides[0].positions[1]
  if (active.state === 'occupied') active.pokemon.health!.currentHp = 7
  session = advanceFieldCombatSession(session, reading(next))
  assert.equal(session.stale, true, 'a retained roster must be identified as a partial read')
  assert.equal(session.playerTeam?.find(pokemon => pokemon.identity === 'own1')?.health?.currentHp, 7)
  assert.equal(session.playerTeam?.find(pokemon => pokemon.identity === 'reserve')?.health?.currentHp, 21)
  assert.equal(session.playerTeam?.find(pokemon => pokemon.identity === 'egg')?.isEgg, true)
  session = advanceFieldCombatSession(session, unknown)
  assert.equal(session.playerTeam?.length, 4)
  session = advanceFieldCombatSession(session, { ...reading(next), playerTeam: [] })
  assert.deepEqual(session.playerTeam, [])
  session = advanceFieldCombatSession(session, { status: 'ready', activity: 'inactive', field: null, messageCode: null })
  assert.equal(session.playerTeam, null)
})

test('format equality uses identifiers rather than property order and distinguishes special games', () => {
  const original = start()
  const reordered = field()
  reordered.format = { state: 'known', value: { id: 'double', kind: 'general' } }
  assert.equal(advanceFieldCombatSession(original, reading(reordered)).revision, original.revision)
  const special = field()
  special.format = { state: 'known', value: { kind: 'special', gameId: 'first', id: 'triple' } }
  const session = start(special)
  const otherGame = structuredClone(special)
  otherGame.format = { state: 'known', value: { kind: 'special', gameId: 'second', id: 'triple' } }
  assert.equal(advanceFieldCombatSession(session, reading(otherGame)).revision, session.revision + 1)
})

test('confirmed empty positions survive unknown readings and new owners cannot inherit another roster total', () => {
  const original = field()
  original.sides[1].positions[0] = { id: 'e0', state: 'empty' }
  let session = start(original)
  const gap = field()
  gap.sides[1].positions[0] = { id: 'e0', state: 'unknown' }
  session = advanceFieldCombatSession(session, reading(gap))
  assert.equal(session.field?.sides[1].positions[0].state, 'empty')
  const changed = field()
  changed.sides[1].owners = [{ id: 'new-owner', control: 'opponent' }]
  changed.sides[1].positions = changed.sides[1].positions.map(position => ({ id: position.id, state: 'unknown' }))
  changed.sides[1].rosterTotal = { state: 'unknown' }
  session = advanceFieldCombatSession(session, reading(changed))
  assert.deepEqual(session.field?.sides[1].rosterTotal, { state: 'unknown' })
  assert.equal(session.field?.sides[1].positions[0].state, 'unknown')
  assert.equal(session.field?.sides[1].positions[1].state, 'unknown')
})
