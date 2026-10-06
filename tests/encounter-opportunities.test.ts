import test from 'node:test'
import assert from 'node:assert/strict'
import { encounterOpportunity } from '../src/domain/encounter-opportunities.ts'
import type { ZoneEncounters } from '../src/domain/encounter-opportunities.ts'
const detail = (chance: number, method = 'walk', conditions: string[] = []) => ({ area: 'area', method, conditions, chance, minLevel: 2, maxLevel: 5 })
const zone = (id: number, details: ReturnType<typeof detail>[]): ZoneEncounters => ({ location: { id, name: 'zone' }, rows: [{ speciesId: 504, name: 'patrat', details }] })
test('only natural encounters count towards a unique zone; gifts elsewhere do not', () => {
  assert.equal(encounterOpportunity(504, 356, [detail(20)], [zone(356, [detail(20)]), zone(357, [detail(100, 'gift')])]).kind, 'unique')
  assert.equal(encounterOpportunity(504, 356, [detail(100, 'gift')], [zone(356, [detail(100, 'gift')])]).kind, 'other')
})
test('later chance must improve the same method and conditions, without summing percentages', () => {
  const zones = [zone(356, [detail(20), detail(40)]), zone(357, [detail(30), detail(100, 'dark-grass'), detail(90, 'walk', ['season-winter'])])]
  assert.equal(encounterOpportunity(504, 356, zones[0].rows[0].details, zones).kind, 'other')
  zones[1].rows[0].details.push(detail(60))
  const result = encounterOpportunity(504, 356, zones[0].rows[0].details, zones)
  assert.equal(result.kind, 'later')
  if (result.kind === 'later') {
    assert.equal(result.alternatives.length, 1)
    assert.equal(result.alternatives[0].current, 40)
    assert.equal(result.alternatives[0].chance, 60)
  }
  assert.equal(encounterOpportunity(504, 357, [detail(10)], zones).kind, 'other')
})
test('condition order is irrelevant and disabled methods cannot offer a better alternative', () => {
  const zones = [zone(356, [detail(10, 'surf')]), zone(357, [detail(50, 'surf')])]
  assert.equal(encounterOpportunity(504, 356, [detail(20)], zones).kind, 'other')
  assert.equal(encounterOpportunity(504, 356, [detail(10, 'surf')], zones).kind, 'later')
  assert.equal(encounterOpportunity(504, 356, [detail(10, 'walk', ['a', 'b'])], [zone(356, [detail(10)]), zone(357, [detail(50, 'walk', ['b', 'a'])])]).kind, 'later')
})
