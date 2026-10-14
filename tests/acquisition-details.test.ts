import test from 'node:test'
import assert from 'node:assert/strict'
import { blackAcquisitionEncounters } from '../src/api/acquisition-details.ts'
import { blackAcquisitionInstructions } from '../src/domain/acquisition-instructions.ts'

test('acquisition details keep original Black only and preserve precise encounter conditions', () => {
  const detail = { method: { name: 'gift' }, min_level: 10, max_level: 10, chance: 100, condition_values: [{ name: 'special-event' }] }
  const rows = blackAcquisitionEncounters([{ location_area: { name: 'castelia-city-area', url: '' }, version_details: [
    { version: { name: 'white' }, encounter_details: [detail] },
    { version: { name: 'black-2' }, encounter_details: [detail] },
    { version: { name: 'black' }, encounter_details: [detail] },
  ] }])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].area, 'castelia-city-area')
  assert.deepEqual(rows[0].condition_values, [{ name: 'special-event' }])
  assert.equal(blackAcquisitionInstructions(570)[0].key, 'zorua')
  assert.equal(blackAcquisitionInstructions(571)[0].key, 'zoroark')
  assert.equal(blackAcquisitionInstructions(138)[0].key, 'olderFossil')
  assert.deepEqual(blackAcquisitionInstructions(506), [])
})
