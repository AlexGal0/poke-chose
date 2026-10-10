import test from 'node:test'
import assert from 'node:assert/strict'
import { daycareEvolutionAlert, nextEvolutionLevel } from '../src/domain/daycare-evolution.ts'
import type { EvolutionNode } from '../src/models/evolution.ts'

test('daycare evolution alert only warns near the evolution threshold and persists after reaching it', () => {
  assert.equal(daycareEvolutionAlert(15, 16, 50), 'soon')
  assert.equal(daycareEvolutionAlert(15, 16, 1), 'soon')
  assert.equal(daycareEvolutionAlert(15, 16, 51), null)
  assert.equal(daycareEvolutionAlert(14, 16, 1), null)
  assert.equal(daycareEvolutionAlert(15, 16, null), null)
  assert.equal(daycareEvolutionAlert(16, 16, 800), 'reached')
  assert.equal(daycareEvolutionAlert(21, 16, null), 'reached')
})

test('daycare evolution selects the next stage and excludes conditional or non-level methods', () => {
  const child: EvolutionNode = { speciesId: 507, name: 'herdier', methods: [{ trigger: { name: 'level-up', url: '' }, min_level: 16 }], children: [{ speciesId: 508, name: 'stoutland', methods: [{ trigger: { name: 'level-up', url: '' }, min_level: 32 }], children: [] }] }
  const root: EvolutionNode = { speciesId: 506, name: 'lillipup', methods: [], children: [child] }
  assert.equal(nextEvolutionLevel(root, 506), 16)
  assert.equal(nextEvolutionLevel(root, 507), 32)
  assert.equal(nextEvolutionLevel(root, 508), null)
  for (const extra of [{ min_happiness: 220 }, { gender: 1 }, { time_of_day: 'night' }, { relative_physical_stats: 0 }, { min_level: null }, { trigger: { name: 'use-item', url: '' } }]) {
    const conditional = { ...root, children: [{ ...child, methods: [{ ...child.methods[0], ...extra }] }] }
    assert.equal(nextEvolutionLevel(conditional, 506), null)
  }
})
