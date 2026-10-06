import test from 'node:test'
import assert from 'node:assert/strict'
import { encounterChances } from '../src/domain/encounter-chances.ts'
import type { BlackEncounterDetail } from '../src/models/encounters.ts'

const detail = (chance: number | null, method = 'walk', conditions: string[] = [], area = 'area'): BlackEncounterDetail => ({ area, method, conditions, chance, minLevel: 2, maxLevel: 5 })

test('sums encounter slots including equal percentages and different levels within a method', () => {
  const groups = encounterChances([detail(20), { ...detail(20), minLevel: 6 }, detail(10), detail(50, 'surf')])
  assert.equal(groups.length, 2)
  assert.equal(groups.find(group => group.method === 'walk')?.chance, 50)
  assert.equal(groups.find(group => group.method === 'surf')?.chance, 50)
})

test('keeps areas and conditions separate while normalizing condition order', () => {
  const groups = encounterChances([detail(10, 'walk', ['a', 'b']), detail(20, 'walk', ['b', 'a']), detail(40, 'walk', ['winter']), detail(60, 'walk', ['a', 'b'], 'other-area')])
  assert.deepEqual(groups.map(group => group.chance), [60, 40, 30])
})

test('excludes trades and unavailable or invalid percentages', () => {
  assert.deepEqual(encounterChances([detail(100, 'npc-trade'), detail(null), detail(NaN), detail(Infinity), detail(-1), detail(101)]), [])
  assert.equal(encounterChances([detail(0)])[0].chance, 0)
})
