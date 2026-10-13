import test from 'node:test'
import assert from 'node:assert/strict'
import { pendingEvolutions, requiredEvolutionItems } from '../src/domain/evolution-requirements.ts'
import type { EvolutionNode } from '../src/models/evolution.ts'

test('pending evolutions require an owned predecessor and an uncaught target, separating trade and items without double counting families', () => {
  const stone = { name: 'water-stone', url: '' }
  const root: EvolutionNode = { speciesId: 133, name: 'eevee', methods: [], children: [
    { speciesId: 134, name: 'vaporeon', methods: [{ trigger: { name: 'use-item', url: '' }, item: stone }], children: [] },
    { speciesId: 135, name: 'jolteon', methods: [{ trigger: { name: 'level-up', url: '' }, min_level: 20 }], children: [] },
    { speciesId: 136, name: 'flareon', methods: [{ trigger: { name: 'trade', url: '' }, held_item: stone }], children: [] },
  ] }
  assert.equal(pendingEvolutions([root], new Set(), new Set()).length, 0)
  const rows = pendingEvolutions([root, root], new Set([133]), new Set([134]))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].group, 'trade')
  assert.equal(requiredEvolutionItems(rows).get('water-stone'), 1)
  assert.equal(requiredEvolutionItems(pendingEvolutions([root], new Set([133]), new Set())).get('water-stone'), 2)
})
