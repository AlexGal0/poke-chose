import test from 'node:test'
import assert from 'node:assert/strict'
import { blackDaycareReading } from '../src/games/black/daycare.ts'
import type { DaycareState } from '../src/models/party.ts'

test('Black daycare normalizes total experience without changing its source', () => {
  const member = { speciesId: 506, form: 0, nickname: 'Pup', gender: 'female', experience: 100, gainedExperience: 25 }
  const source = { slots: [member, null], eggAvailable: true } as DaycareState
  const reading = blackDaycareReading(source, false, true)
  assert.deepEqual(reading, { available: true, stale: false, data: {
    slots: [{ speciesId: 506, form: 0, nickname: 'Pup', gender: 'female', experience: 125 }, null], eggAvailable: true,
  } })
  assert.equal(member.experience, 100)
  assert.equal(member.gainedExperience, 25)
})

test('unavailable, confirmed empty and stale daycare remain distinct', () => {
  const empty: DaycareState = { slots: [null, null], eggAvailable: false }
  assert.equal(blackDaycareReading(empty, false, false).data, null)
  assert.equal(blackDaycareReading(null, true, true).data, null)
  assert.deepEqual(blackDaycareReading(empty, false, true).data?.slots, [null, null])
  const stale = blackDaycareReading(empty, true, true)
  assert.equal(stale.stale, true)
  assert.notEqual(stale.data, null)
})
