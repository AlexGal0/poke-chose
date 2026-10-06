import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error Experimental discovery tool is intentionally JavaScript.
import { locateEnemyCandidates } from '../experiments/melonds-live/enemy.mjs'
import { pk5Fixture } from './helpers/save-fixture.ts'
import { parsePk5 } from '../bridge/parser.ts'
import { consistentEnemyCandidate } from '../src/domain/enemy-prototype.ts'

test('enemy discovery filters species, own individuals and corrupt copies without confirming a battle', () => {
  const ram = Buffer.alloc(2048)
  const enemy = pk5Fixture(568, 21)
  enemy.copy(ram, 128)
  enemy.copy(ram, 512)
  ram[520] ^= 1
  pk5Fixture(502, 25).copy(ram, 1024)
  const candidates = locateEnemyCandidates(ram, 0x02000000, 568)
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].address, '0x2000080')
  assert.equal(candidates[0].level, 21)
  assert.equal(candidates[0].confirmedOpponent, false)
  assert.deepEqual(locateEnemyCandidates(ram, 0x02000000, 568, [parsePk5(enemy)]), [])
  assert.throws(() => locateEnemyCandidates(ram, 0x02000000, 650), /Especie/)
})

test('enemy prototype hides stale encounter copies after battle copies disappear or disagree', () => {
  const member = { address: '0x2259d98', speciesId: 568, form: 0, level: 19, personality: 123, trainerId: 456 }
  assert.deepEqual(consistentEnemyCandidate([member, { ...member, address: '0x226acb4' }]), member)
  assert.equal(consistentEnemyCandidate([member, { address: '0x226acb4' }]), null)
  assert.equal(consistentEnemyCandidate([member, { ...member, speciesId: 572 }]), null)
  assert.equal(consistentEnemyCandidate([member, { ...member, personality: 789 }]), null)
  assert.equal(consistentEnemyCandidate([member]), null)
  assert.equal(consistentEnemyCandidate([{ ...member, speciesId: 700 }, { ...member, speciesId: 700 }]), null)
})
