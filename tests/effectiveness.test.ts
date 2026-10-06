import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectiveness, analyzeDefense, analyzeCoverage, stabTypes } from '../src/domain/effectiveness.ts'
import { TYPES } from '../src/models/pokemon.ts'
import type { Pokemon } from '../src/models/pokemon.ts'

test('single types: supereffective, neutral and resisted', () => {
  assert.equal(effectiveness('water', ['fire']), 2)
  assert.equal(effectiveness('normal', ['water']), 1)
  assert.equal(effectiveness('fire', ['water']), 0.5)
})
test('dual types multiply: 4x, 0.25x and cancellation', () => {
  assert.equal(effectiveness('ice', ['dragon', 'flying']), 4)
  assert.equal(effectiveness('grass', ['bug', 'steel']), 0.25)
  assert.equal(effectiveness('fire', ['water', 'grass']), 1)
})
test('immunity takes precedence over weakness regardless of slot order', () => {
  assert.equal(effectiveness('electric', ['water', 'ground']), 0)
  assert.equal(effectiveness('electric', ['ground', 'water']), 0)
  assert.equal(effectiveness('ground', ['electric', 'flying']), 0)
  assert.equal(effectiveness('normal', ['ghost']), 0)
  assert.equal(effectiveness('fighting', ['ghost']), 0)
  assert.equal(effectiveness('psychic', ['dark']), 0)
  assert.equal(effectiveness('poison', ['steel']), 0)
})
test('Gen V: Steel resists Ghost and Dark; only 17 types exist', () => {
  assert.equal(effectiveness('ghost', ['steel']), 0.5)
  assert.equal(effectiveness('dark', ['steel']), 0.5)
  assert.equal(TYPES.length, 17)
})
const team: Pokemon[] = [
  { id: 6, name: 'charizard', types: ['fire', 'flying'], sprite: null },
  { id: 130, name: 'gyarados', types: ['water', 'flying'], sprite: null },
  { id: 260, name: 'swampert', types: ['water', 'ground'], sprite: null },
  { id: 462, name: 'magnezone', types: ['electric', 'steel'], sprite: null },
  { id: 598, name: 'ferrothorn', types: ['grass', 'steel'], sprite: null },
  { id: 609, name: 'chandelure', types: ['ghost', 'fire'], sprite: null },
]
test('full six-member analysis counts categories and exposes exact multipliers', () => {
  const result = analyzeDefense(team)
  assert.equal(result.length, 17)
  for (const row of result) {
    assert.equal(row.weak + row.neutral + row.resistant + row.immune, 6)
    assert.equal(row.members.length, 6)
  }
  const electric = result.find(row => row.type === 'electric')!
  assert.deepEqual([electric.weak, electric.neutral, electric.resistant, electric.immune], [2, 1, 2, 1])
  assert.deepEqual(electric.members.map(p => p.multiplier), [2, 4, 0, 0.5, 0.5, 1])
  const ground = result.find(row => row.type === 'ground')!
  assert.deepEqual([ground.weak, ground.neutral, ground.resistant, ground.immune], [2, 2, 0, 2])
})
test('empty team produces zero counts and no coverage', () => {
  assert.ok(analyzeDefense([]).every(row => row.weak + row.neutral + row.resistant + row.immune === 0))
  assert.ok(analyzeCoverage(stabTypes([])).every(row => row.attackers.length === 0))
})
test('offense deduplicates STAB and accepts future move types', () => {
  assert.deepEqual(stabTypes(team), ['fire', 'flying', 'water', 'ground', 'electric', 'steel', 'grass', 'ghost'])
  const coverage = analyzeCoverage(['fire', 'fire', 'fighting'])
  assert.deepEqual(coverage.find(row => row.type === 'steel')!.attackers, ['fire', 'fighting'])
  assert.deepEqual(coverage.find(row => row.type === 'ghost')!.attackers, [])
  assert.deepEqual(analyzeCoverage(['ice']).find(row => row.type === 'dragon')!.attackers, ['ice'])
})
