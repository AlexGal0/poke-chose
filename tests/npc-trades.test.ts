import test from 'node:test'
import assert from 'node:assert/strict'
import { blackNpcTrades, withBlackNpcTrades } from '../src/domain/npc-trades.ts'
import { accessibleEncounters } from '../src/domain/encounter-access.ts'
import { encounterOpportunity } from '../src/domain/encounter-opportunities.ts'
import { captureChecklist } from '../src/domain/checklist.ts'
import { acquisitionTags } from '../src/domain/acquisition.ts'
import { getBlackEncounters } from '../src/api/encounters.ts'

test('original Black trades include Petilil for Cottonee, not White or Black 2 alternatives', () => {
  assert.equal(blackNpcTrades.length, 5)
  assert.deepEqual(blackNpcTrades.map(trade => [trade.locationId, trade.speciesId, trade.level]), [[349,548,15],[352,550,25],[362,587,30],[384,446,60],[370,479,60]])
  const rows = withBlackNpcTrades(349, [])
  assert.equal(rows[0].details[0].trade?.requested, 'Cottonee')
  assert.equal(rows[0].details[0].chance, null)
  assert.equal(accessibleEncounters(rows, { surf: false, superRod: false }).length, 1)
  assert.equal(captureChecklist(rows, new Set([548])).caught, 1)
  assert.equal(encounterOpportunity(548,349,rows[0].details,[{location:{id:349,name:'nacrene-city'},rows}]).kind,'other')
  assert.equal(withBlackNpcTrades(359, []).length, 0)
  assert.deepEqual(withBlackNpcTrades(384, [])[0].details[0].conditions, ['season-summer'])
})
test('trade supplements enrich generic records, preserve wild encounters, deduplicate and never mutate cached arrays', () => {
  const rows = [{ speciesId: 587, name: 'emolga', details: [
    { area: 'area', method: 'grass-spots', minLevel: 23, maxLevel: 25, chance: 10, conditions: [] },
    { area: 'area', method: 'npc-trade', minLevel: 30, maxLevel: 30, chance: 100, conditions: [] },
  ] }]
  const merged = withBlackNpcTrades(362, rows)
  assert.equal(merged[0].details.length, 2)
  assert.equal(merged[0].details[0].chance, 10)
  assert.equal(merged[0].details[1].trade?.requested, 'Boldore')
  assert.equal(rows[0].details[1].chance, 100)
  assert.deepEqual(withBlackNpcTrades(362, merged), merged)
  for (const trade of blackNpcTrades) assert.ok(acquisitionTags(trade.speciesId, [], undefined).some(tag => tag.kind === 'npc-trade'))
})
test('API adds verified trades even when PokéAPI returns no areas', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ areas: [] }))
  try {
    const rows = await getBlackEncounters(349)
    assert.equal(rows[0].speciesId, 548)
    assert.equal(rows[0].details[0].minLevel, 15)
    assert.equal(rows[0].details[0].trade?.requested, 'Cottonee')
  } finally { globalThis.fetch = original }
})
