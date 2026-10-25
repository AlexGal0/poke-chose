import test from 'node:test'
import assert from 'node:assert/strict'
import { daycareAlerts } from '../src/domain/daycare-alerts.ts'
import type { DaycareReading } from '../src/games/core/daycare.ts'

const reading: DaycareReading = { available: true, stale: false, data: { eggAvailable: true, slots: [{ speciesId: 653, form: 0, experience: 1475 }, null] } }
const species = new Map([[653, { target: 16, levels: Array.from({ length: 100 }, (_, i) => ({ level: i + 1, experience: i * 100 })) }]])

test('egg alert is immediate even when evolution metadata is missing or unavailable', () => {
  assert.deepEqual(daycareAlerts(reading, new Map()), { egg: true, evolutions: [] })
  assert.equal(daycareAlerts({ ...reading, data: { eggAvailable: true, slots: [null, null] } }, new Map()).egg, true)
})

test('egg and evolution alerts coexist and clear on a confirmed egg collection', () => {
  assert.deepEqual(daycareAlerts(reading, species), { egg: true, evolutions: [{ slot: 1, alert: 'soon' }] })
  assert.deepEqual(daycareAlerts({ ...reading, data: { ...reading.data!, eggAvailable: false } }, species), { egg: false, evolutions: [{ slot: 1, alert: 'soon' }] })
})

test('unavailable, manual and stale readings never raise daycare alerts', () => {
  for (const update of [{ available: false }, { stale: true }, { data: null }]) assert.deepEqual(daycareAlerts({ ...reading, ...update }, species), { egg: false, evolutions: [] })
})
