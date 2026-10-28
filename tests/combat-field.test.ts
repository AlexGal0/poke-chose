import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { CombatField, FieldPokemon, GeneralCombatFormat } from '../src/games/core/combat.ts'
import { GENERAL_COMBAT_POSITIONS } from '../src/games/core/combat.ts'
import { validCombatField } from '../src/domain/combat-field.ts'

const pokemon = (identity: string, ownerId: string, partySlot = 4): FieldPokemon => ({
  identity, ownerId, partySlot, speciesId: 694, form: 0, level: 25,
  health: { currentHp: 25, maxHp: 61 }, stages: null,
})

function field(id: GeneralCombatFormat): CombatField {
  const [own, enemy] = GENERAL_COMBAT_POSITIONS[id]
  return { format: { state: 'known', value: { kind: 'general', id } }, sides: [
    { id: 'player', owners: [{ id: 'self', control: 'player' }], rosterTotal: { state: 'unknown' },
      positions: Array.from({ length: own }, (_, index) => ({ id: String(index), state: 'occupied', pokemon: pokemon(`own-${index}`, 'self', index + 3) })) },
    { id: 'opponent', owners: [{ id: 'enemy', control: 'wild' }], rosterTotal: { state: 'known', value: enemy },
      positions: Array.from({ length: enemy }, (_, index) => ({ id: String(index), state: 'occupied', pokemon: pokemon(`enemy-${index}`, 'enemy', index) })) },
  ] }
}

test('general formats admit repeated species with distinct identities and independent party slots', () => {
  for (const format of ['single', 'double', 'horde'] as const) assert.equal(validCombatField(field(format)), true)
})

test('a horde remains a horde through fainting, empty positions and unknown readings', () => {
  const reading = field('horde')
  reading.sides[1].positions = [
    { id: '0', state: 'occupied', pokemon: { ...pokemon('enemy-0', 'enemy'), health: { currentHp: 0, maxHp: 61 } } },
    { id: '1', state: 'empty' }, { id: '2', state: 'unknown' }, { id: '3', state: 'empty' }, { id: '4', state: 'empty' },
  ]
  assert.equal(validCombatField(reading), true)
  assert.deepEqual(reading.format, { state: 'known', value: { kind: 'general', id: 'horde' } })
  reading.sides[1].positions = []
  assert.equal(validCombatField(reading), false)
})

test('allied owners have separate parties and share the player side', () => {
  const reading = field('double')
  reading.sides[0].owners = [{ id: 'self', control: 'player' }, { id: 'partner', control: 'ally' }]
  reading.sides[0].positions = [
    { id: 'left', state: 'occupied', pokemon: pokemon('self-0', 'self', 0) },
    { id: 'right', state: 'occupied', pokemon: pokemon('ally-0', 'partner', 0) },
  ]
  assert.equal(validCombatField(reading), true)
  reading.sides[0].owners = [{ id: 'self', control: 'player' }]
  assert.equal(validCombatField(reading), false)
})

test('roster total includes reserves without disclosing species or imposing a six-member side limit', () => {
  const reading = field('double')
  reading.sides[1].rosterTotal = { state: 'known', value: 12 }
  assert.equal(validCombatField(reading), true)
  for (const value of [-1, 1, 2.5, NaN]) {
    reading.sides[1].rosterTotal = { state: 'known', value }
    assert.equal(validCombatField(reading), false)
  }
  reading.sides[1].rosterTotal = { state: 'unknown' }
  assert.equal(validCombatField(reading), true)
})

test('invalid identities, duplicate field positions, eggs and wrong owner sides are rejected', () => {
  const reading = field('double')
  reading.sides[1].positions = [
    { id: 'left', state: 'occupied', pokemon: pokemon('same', 'enemy') },
    { id: 'right', state: 'occupied', pokemon: pokemon('same', 'enemy') },
  ]
  assert.equal(validCombatField(reading), false)
  reading.sides[1].positions = [{ id: 'same', state: 'empty' }, { id: 'same', state: 'unknown' }]
  assert.equal(validCombatField(reading), false)
  const single = field('single')
  single.sides[0].positions = [{ id: '0', state: 'occupied', pokemon: { ...pokemon('egg', 'self'), isEgg: true } }]
  assert.equal(validCombatField(single), false)
  single.sides[0].positions = [{ id: '0', state: 'empty' }]
  single.sides[0].owners = [{ id: 'self', control: 'opponent' }]
  assert.equal(validCombatField(single), false)
})

test('unknown and game-scoped special formats do not inherit general position limits', () => {
  const reading = field('horde')
  reading.format = { state: 'unknown' }
  assert.equal(validCombatField(reading), true)
  reading.format = { state: 'known', value: { kind: 'special', gameId: 'black', id: 'rotation' } }
  assert.equal(validCombatField(reading), true)
  reading.format = { state: 'known', value: { kind: 'special', gameId: '', id: 'rotation' } }
  assert.equal(validCombatField(reading), false)
})
