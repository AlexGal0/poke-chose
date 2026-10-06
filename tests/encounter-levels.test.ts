import test from 'node:test'
import assert from 'node:assert/strict'
import { minimumEncounterLevel, orderEncountersByLevel } from '../src/domain/encounter-levels.ts'
import { accessibleEncounters } from '../src/domain/encounter-access.ts'
import type { EncounterSpecies } from '../src/models/encounters.ts'

const row = (speciesId: number, levels: number[]): EncounterSpecies => ({ speciesId, name: 'test', details: levels.map(minLevel => ({ area: 'area', method: 'walk', minLevel, maxLevel: 50, chance: 20, conditions: [] })) })
test('minimum level spans methods/subareas and sorts ascending without modifying source rows', () => {
  const rows = [row(504, [12, 7]), row(495, [3]), row(506, [7]), row(500, [])]
  assert.equal(minimumEncounterLevel(rows[0]), 7)
  assert.deepEqual(orderEncountersByLevel(rows).map(row => row.speciesId), [495, 504, 506, 500])
  assert.deepEqual(rows.map(row => row.speciesId), [504, 495, 506, 500])
  assert.equal(minimumEncounterLevel(row(1, [NaN, 0, -1, 101, 1.5])), null)
})
test('minimum level and ordering respect disabled Surf encounters', () => {
  const water = row(502, [2, 20])
  water.details[0].method = 'surf'
  const rows = [water, row(504, [10])]
  const filtered = orderEncountersByLevel(accessibleEncounters(rows, { surf: false, superRod: false }))
  assert.deepEqual(filtered.map(row => row.speciesId), [504, 502])
  assert.equal(minimumEncounterLevel(filtered[1]), 20)
  assert.equal(minimumEncounterLevel(water), 2)
})
