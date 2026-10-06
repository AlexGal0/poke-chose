import test from 'node:test'
import assert from 'node:assert/strict'
import { consistentStatStages, validStatStages, updateStatStagesDisplay } from '../src/domain/battle-stat-stages.ts'
// @ts-expect-error Experimental stat reader is JavaScript.
import { stableStatStages } from '../experiments/melonds-live/battle-stat-stages.mjs'

test('rank bytes decode increases, decreases and neutral stages within the six-stage limits', () => {
  const bytes = Buffer.from([12, 0, 8, 4, 6, 7, 5])
  assert.deepEqual(stableStatStages(bytes, bytes), { statStages: {
    attack: 6, defense: -6, specialAttack: 2, specialDefense: -2, speed: 0, accuracy: 1, evasion: -1,
  } })
  assert.deepEqual(stableStatStages(null, bytes), {})
  assert.deepEqual(stableStatStages(bytes, Buffer.alloc(7)), {})
  assert.deepEqual(stableStatStages(Buffer.from([13, 6, 6, 6, 6, 6, 6]), Buffer.from([13, 6, 6, 6, 6, 6, 6])), {})
})

test('UI stages require two matching identities and complete valid stat readings without stale fallback', () => {
  const bytes = Buffer.alloc(7, 6)
  const { statStages } = stableStatStages(bytes, bytes)
  const candidate = { address: '', speciesId: 507, form: 0, level: 27, personality: 1, trainerId: 2, statStages }
  assert.deepEqual(consistentStatStages(candidate, [candidate, candidate]), statStages)
  assert.equal(consistentStatStages(null, [candidate, candidate]), null)
  assert.equal(consistentStatStages(candidate, [candidate]), null)
  assert.equal(consistentStatStages(candidate, [candidate, { ...candidate, personality: 3 }]), null)
  assert.equal(consistentStatStages(candidate, [candidate, { ...candidate, statStages: undefined }]), null)
  assert.equal(validStatStages({ ...statStages, attack: 7 }), false)
  assert.equal(validStatStages({ ...statStages, defense: -7 }), false)
  assert.equal(validStatStages({ ...statStages, speed: 1.5 }), false)
  assert.equal(validStatStages({ attack: 0 }), false)
})

test('display preserves changes during attacks, accepts confirmed resets and clears on participant replacement', () => {
  const { statStages: stages } = stableStatStages(Buffer.from([8, 5, 6, 6, 6, 6, 6]), Buffer.from([8, 5, 6, 6, 6, 6, 6]))
  const display = { identity: 'herdier', stages }
  assert.equal(updateStatStagesDisplay(display, 'herdier', null), display)
  const { statStages: neutral } = stableStatStages(Buffer.alloc(7, 6), Buffer.alloc(7, 6))
  assert.deepEqual(updateStatStagesDisplay(display, 'herdier', neutral), { identity: 'herdier', stages: neutral })
  assert.deepEqual(updateStatStagesDisplay(display, 'dewott', null), { identity: 'dewott', stages: null })
})
