import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { CombatFormat } from '../src/games/core/combat.ts'
import { combatFormatAvailability, sameCombatFormat } from '../src/games/core/combat-capabilities.ts'
import { blackCombatCapabilities, blackBattleReaderCapabilities } from '../src/games/black/combat-capabilities.ts'
import { xCombatCapabilities, xBattleReaderCapabilities } from '../src/games/x/combat-capabilities.ts'

const single: CombatFormat = { kind: 'general', id: 'single' }
const double: CombatFormat = { kind: 'general', id: 'double' }
const horde: CombatFormat = { kind: 'general', id: 'horde' }

test('X reads the general formats while Black keeps singles and special formats remain pending', () => {
  for (const [game, reader] of [[blackCombatCapabilities, blackBattleReaderCapabilities], [xCombatCapabilities, xBattleReaderCapabilities]] as const) {
    assert.equal(combatFormatAvailability(game, reader, single), 'readable')
    assert.equal(combatFormatAvailability(game, reader, double), game.gameId === 'x' ? 'readable' : 'pending')
    assert.deepEqual(reader.formats, game.gameId === 'x' ? [single, double, horde] : [single])
    for (const id of ['triple', 'rotation']) {
      assert.equal(combatFormatAvailability(game, reader, { kind: 'special', gameId: game.gameId, id }), 'pending')
    }
  }
})

test('horde is readable in X and unavailable in Black', () => {
  assert.equal(combatFormatAvailability(xCombatCapabilities, xBattleReaderCapabilities, horde), 'readable')
  assert.equal(combatFormatAvailability(blackCombatCapabilities, blackBattleReaderCapabilities, horde), 'unavailable')
  // An erroneous reader claim cannot introduce formats absent from a game.
  assert.equal(combatFormatAvailability(blackCombatCapabilities, { ...blackBattleReaderCapabilities, formats: [horde] }, horde), 'unavailable')
})

test('manual, save-only and another games reader cannot grant combat reading', () => {
  assert.equal(combatFormatAvailability(xCombatCapabilities, null, single), 'pending')
  assert.equal(combatFormatAvailability(xCombatCapabilities, { gameId: 'x', readerId: 'save-only', formats: [] }, single), 'pending')
  assert.equal(combatFormatAvailability(xCombatCapabilities, blackBattleReaderCapabilities, single), 'pending')
})

test('special formats are scoped by game and cannot collide with general identifiers', () => {
  const blackTriple: CombatFormat = { kind: 'special', gameId: 'black', id: 'triple' }
  const xTriple: CombatFormat = { kind: 'special', gameId: 'x', id: 'triple' }
  assert.equal(sameCombatFormat(blackTriple, xTriple), false)
  assert.equal(sameCombatFormat(blackTriple, { ...blackTriple }), true)
  assert.equal(sameCombatFormat(single, { kind: 'special', gameId: 'x', id: 'single' }), false)
  assert.equal(combatFormatAvailability(xCombatCapabilities, xBattleReaderCapabilities, blackTriple), 'unavailable')
})

test('a future game-specific format can be declared and enabled without changing the shared resolver', () => {
  const special: CombatFormat = { kind: 'special', gameId: 'test-game', id: 'test-format' }
  const game = { gameId: 'test-game', formats: [special] }
  const reader = { gameId: 'test-game', readerId: 'synthetic', formats: [special] }
  assert.equal(combatFormatAvailability(game, null, special), 'pending')
  assert.equal(combatFormatAvailability(game, reader, special), 'readable')
})
