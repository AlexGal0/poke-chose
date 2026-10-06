import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyBattleSession, updateBattleSession } from '../src/domain/battle-session.ts'
import { battleHasEnded, battleHasStarted } from '../src/domain/battle-shortcut.ts'

const enemy = { address: '', speciesId: 513, form: 0, level: 23, personality: 1, trainerId: 2 }
const own = { ...enemy, speciesId: 507, personality: 3, slot: 1, battleSlot: 0 }
const reading = { status: 'ready', candidates: [enemy, enemy], activeCandidates: [own, own], battleActive: true }

test('trainer replacement gaps and attack transitions keep the battle and its participants for any duration', () => {
  let session = updateBattleSession(emptyBattleSession(), reading)
  assert.equal(battleHasStarted(false, { status: 'ready', inBattle: session.inBattle }), true)
  for (let index = 0; index < 30; index++) {
    session = updateBattleSession(session, { status: 'ready', candidates: [], activeCandidates: [], battleActive: index % 2 ? true : null })
    assert.equal(session.inBattle, true)
    assert.equal(session.enemy, enemy)
    assert.equal(session.own, own)
    assert.equal(battleHasEnded(true, { status: 'ready', inBattle: session.inBattle }), false)
  }
  const replacement = { ...enemy, speciesId: 515, personality: 4 }
  session = updateBattleSession(session, { ...reading, candidates: [replacement, replacement] })
  assert.equal(session.enemy, replacement)
  assert.equal(session.own, own)
  assert.equal(battleHasStarted(true, { status: 'ready', inBattle: session.inBattle }), false)
})

test('only a confirmed released battle clears participants and permits return followed by a new entry', () => {
  const session = updateBattleSession(emptyBattleSession(), reading)
  assert.equal(updateBattleSession(session, { status: 'error', candidates: [], battleActive: false }), session)
  assert.equal(updateBattleSession(session, { status: 'waiting', candidates: [] }), session)
  const ended = updateBattleSession(session, { ...reading, battleActive: false })
  assert.deepEqual(ended, emptyBattleSession())
  assert.equal(battleHasEnded(true, { status: 'ready', inBattle: ended.inBattle }), true)
  const next = updateBattleSession(ended, reading)
  assert.equal(battleHasStarted(ended.inBattle, { status: 'ready', inBattle: next.inBattle }), true)
})

test('a reader without an explicit battle flag cannot confuse an unconfirmed rival with the end', () => {
  const idle = emptyBattleSession()
  assert.equal(updateBattleSession(idle, { status: 'ready', candidates: [] }), idle)
  const started = updateBattleSession(idle, { ...reading, battleActive: undefined })
  assert.equal(started.inBattle, true)
  assert.equal(updateBattleSession(started, { status: 'ready', candidates: [] }).inBattle, true)
})

test('own participant can switch while the trainer opponent is temporarily unconfirmed', () => {
  const session = updateBattleSession(emptyBattleSession(), reading)
  const replacement = { ...own, speciesId: 502, personality: 5, slot: 2 }
  const updated = updateBattleSession(session, { status: 'ready', candidates: [], activeCandidates: [replacement, replacement], battleActive: true })
  assert.equal(updated.own, replacement)
  assert.equal(updated.enemy, enemy)
})
