import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findIndividual } from '../src/domain/individual-pokemon.ts'

test('the open specimen follows its identity across slots and boxes without selecting a namesake', () => {
  const selected = { personality: 12, trainerId: 34, speciesId: 502, instanceKey: 'party-1' }
  const namesake = { ...selected, personality: 99, instanceKey: 'party-1', currentHp: 99 }
  const moved = { ...selected, instanceKey: 'box-2-3', currentHp: undefined }
  assert.equal(findIndividual(selected, [namesake, moved]), moved)
  assert.equal(findIndividual(selected, [namesake]), undefined)
  assert.equal(findIndividual(selected, [{ ...selected, trainerId: 35 }]), undefined)
  assert.equal(findIndividual(selected, [{ ...selected, speciesId: 503 }]), undefined)
})

test('ambiguous cloned identities are not substituted after leaving their original slot', () => {
  const selected = { personality: 12, trainerId: 34, speciesId: 502, instanceKey: 'party-1' }
  const original = { ...selected, currentHp: 20 }
  const clone = { ...selected, instanceKey: 'box-2', currentHp: 70 }
  assert.equal(findIndividual(selected, [clone, original]), original)
  assert.equal(findIndividual({ ...selected, instanceKey: 'gone' }, [clone, original]), undefined)
})
