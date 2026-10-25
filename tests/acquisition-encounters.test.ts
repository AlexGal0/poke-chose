import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeAcquisitionEncounters } from '../src/domain/acquisition-encounters.ts'

test('encounter summaries combine slots while keeping areas, methods and conditions separate', () => {
  const row = { area: 'cave-1f', method: { name: 'walk' }, min_level: 10, max_level: 10, chance: 20, condition_values: [{ name: 'summer' }] }
  const rows = [row, { ...row, min_level: 12, max_level: 14, chance: 10 }, { ...row, area: 'cave-2f' }, { ...row, method: { name: 'surf' } }, { ...row, condition_values: [{ name: 'winter' }] }]
  const summary = summarizeAcquisitionEncounters(rows)
  assert.equal(summary.length, 4)
  assert.equal(summary[0].chance, 30)
  assert.equal(summary[0].min_level, 10)
  assert.equal(summary[0].max_level, 14)
  assert.equal(row.chance, 20)
  assert.equal(summarizeAcquisitionEncounters([row, { ...row, chance: 90 }])[0].chance, 100)
})
