import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accessibleEncounters } from '../src/domain/encounter-access.ts'
import { captureChecklist } from '../src/domain/checklist.ts'
import type { EncounterSpecies } from '../src/models/encounters.ts'

const row = (speciesId: number, methods: string[]): EncounterSpecies => ({
  speciesId, name: String(speciesId), details: methods.map(method => ({
    area: 'test', method, minLevel: 5, maxLevel: 10, chance: 20, conditions: ['season-spring'],
  })),
})
const rows = [row(504, ['walk']), row(550, ['surf', 'surf-spots']), row(594, ['super-rod', 'super-rod-spots']), row(535, ['walk', 'surf'])]

test('no equipment retains land encounters and strips inaccessible methods from shared species without mutation', () => {
  const filtered = accessibleEncounters(rows, { surf: false, superRod: false })
  assert.deepEqual(filtered.map(entry => entry.speciesId), [504, 535])
  assert.deepEqual(filtered[1].details.map(detail => detail.method), ['walk'])
  assert.equal(rows[3].details.length, 2)
  assert.deepEqual(filtered[1].details[0].conditions, ['season-spring'])
})

test('Surf and Super Rod independently enable normal and rippling-water encounters', () => {
  assert.deepEqual(accessibleEncounters(rows, { surf: true, superRod: false }).map(entry => entry.speciesId), [504, 550, 535])
  assert.deepEqual(accessibleEncounters(rows, { surf: false, superRod: true }).map(entry => entry.speciesId), [504, 594, 535])
  assert.deepEqual(accessibleEncounters(rows, { surf: true, superRod: true }), rows)
})

test('spot-only species require the corresponding equipment using exact PokéAPI plural identifiers', () => {
  const spots = [row(550, ['surf-spots']), row(594, ['super-rod-spots'])]
  assert.deepEqual(accessibleEncounters(spots, { surf: false, superRod: false }), [])
  assert.deepEqual(accessibleEncounters(spots, { surf: true, superRod: false }).map(entry => entry.speciesId), [550])
  assert.deepEqual(accessibleEncounters(spots, { surf: false, superRod: true }).map(entry => entry.speciesId), [594])
  assert.deepEqual(accessibleEncounters(spots, { surf: true, superRod: true }), spots)
})

test('checklist totals count only accessible species, caught flags are never changed by equipment', () => {
  const caught = new Set([504, 550, 594])
  const result = captureChecklist(accessibleEncounters(rows, { surf: false, superRod: false }), caught)
  assert.equal(result.caught, 1)
  assert.equal(result.total, 2)
  assert.deepEqual([...caught], [504, 550, 594])
  assert.deepEqual(accessibleEncounters([row(550, ['surf'])], { surf: false, superRod: false }), [])
})
