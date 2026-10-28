import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceCombatSession, emptyCombatSession } from '../src/domain/battle-lifecycle.ts'
import { normalizeXBattle } from '../src/games/x/battle-source.ts'
import { normalizeBlackBattle } from '../src/games/black/battle-source.ts'
import { isBattleReading } from '../src/models/battle.ts'

const enemy = { identity: '694:1:2', speciesId: 694, form: 0, level: 25, currentHp: 25, maxHp: 61, partySlot: 2 }
const reading = { active: true, own: null, enemy, opponentRosterTotal: 3 }
const observation = () => normalizeXBattle(reading, 'ready', [])

test('X preserves a confirmed total while older snapshots and Black report unknown', () => {
  assert.equal(observation().opponentRosterTotal, 3)
  assert.equal(normalizeXBattle({ active: true, own: null, enemy }, 'ready', []).opponentRosterTotal, null)
  assert.equal(normalizeXBattle(null, 'ready', []).opponentRosterTotal, null)
  assert.equal(normalizeBlackBattle({ status: 'ready', message: 'ready', candidates: [], updatedAt: null }).opponentRosterTotal, null)
})

test('roster total survives replacements, fainting, prolonged gaps and disconnects and clears on exit', () => {
  let session = advanceCombatSession(emptyCombatSession(), observation())
  for (let i = 0; i < 20; i++) session = advanceCombatSession(session, normalizeXBattle(null, 'ready', []))
  assert.equal(session.opponentRosterTotal, 3)
  session = advanceCombatSession(session, normalizeXBattle({ ...reading, enemy: { ...enemy, identity: '210:3:2', speciesId: 210, partySlot: 1, currentHp: 0 } }, 'ready', []))
  assert.equal(session.opponentRosterTotal, 3)
  assert.equal(advanceCombatSession(session, { ...observation(), status: 'error', opponentRosterTotal: 1 }).opponentRosterTotal, 3)
  session = advanceCombatSession(session, normalizeXBattle({ active: false, own: null, enemy: null }, 'ready', []))
  assert.equal(session.opponentRosterTotal ?? null, null)
  session = advanceCombatSession(session, normalizeXBattle({ active: true, own: null, enemy }, 'ready', []))
  assert.equal(session.opponentRosterTotal, null, 'a new battle cannot inherit the previous total')
})

test('X payload accepts absent totals and rejects malformed or inconsistent totals', () => {
  assert.equal(isBattleReading(reading, 721), true)
  assert.equal(isBattleReading({ active: true, own: null, enemy }, 721), true)
  for (const total of [0, -1, 7, 1.5, '3', {}, 2, NaN]) {
    assert.equal(isBattleReading({ ...reading, opponentRosterTotal: total }, 721), false)
  }
  assert.equal(isBattleReading({ active: false, own: null, enemy: null, opponentRosterTotal: 3 }, 721), false)
  assert.equal(isBattleReading({ active: false, own: null, enemy: null, opponentRosterTotal: null }, 721), true)
})
