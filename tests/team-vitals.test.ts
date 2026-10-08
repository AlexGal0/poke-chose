import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePk5 } from '../bridge/parser.ts'
import { partiesEqual, isSaveSnapshot } from '../src/models/party.ts'
import { pk5Fixture } from './helpers/save-fixture.ts'
import { experienceProgress } from '../src/domain/experience.ts'

test('party reads HP and experience across block shuffles, including fainted Pokemon', () => {
  for (let shuffle = 0; shuffle < 24; shuffle++) {
    const member = parsePk5(pk5Fixture(502, 25, shuffle, undefined, { currentHp: 0, maxHp: 83, experience: 16001 }))
    assert.equal(member.currentHp, 0)
    assert.equal(member.maxHp, 83)
    assert.equal(member.experience, 16001)
    assert.equal(partiesEqual([member], [{ ...member, currentHp: 1 }]), false)
    assert.equal(partiesEqual([member], [{ ...member, experience: 16002 }]), false)
    const snapshot = { status: 'ready', message: '', party: [member], boxes: [], pokedex: null, updatedAt: null, backup: false }
    assert.equal(isSaveSnapshot(snapshot), true)
    assert.equal(isSaveSnapshot({ ...snapshot, party: [{ ...member, currentHp: 84 }] }), false)
    assert.equal(isSaveSnapshot({ ...snapshot, party: [{ ...member, experience: -1 }] }), false)
    const { currentHp, maxHp, experience, currentStats, natureId, ...legacy } = member
    assert.ok(currentHp === 0 && maxHp === 83 && experience === 16001)
    assert.ok(currentStats && natureId === 0)
    assert.equal(isSaveSnapshot({ ...snapshot, party: [legacy] }), true)
  }
})

test('experience progress uses species thresholds and handles boundaries and level 100', () => {
  const levels = [{ level: 25, experience: 15625 }, { level: 26, experience: 17576 }]
  assert.deepEqual(experienceProgress(25, 16000, levels), { value: 375, max: 1951, remaining: 1576 })
  assert.deepEqual(experienceProgress(25, 15625, levels), { value: 0, max: 1951, remaining: 1951 })
  assert.equal(experienceProgress(25, 17576, levels), null)
  assert.equal(experienceProgress(25, 100, levels), null)
  assert.equal(experienceProgress(26, 18000, levels), null)
  assert.deepEqual(experienceProgress(100, 1000000, []), { value: 1, max: 1, remaining: 0 })
})
