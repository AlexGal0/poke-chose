import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generationVRules as v, generationVIRules as vi } from '../src/domain/type-rules.ts'
import { typeEffectiveness, typeDefense, typeCoverage } from '../src/domain/type-analysis.ts'
import { effectiveness } from '../src/domain/effectiveness.ts'

test('only the two existing matchups change between Gen V and VI; Black retains its chart', () => {
  const changed: string[] = []
  for (const attack of v.types) for (const defense of v.types) {
    const old = typeEffectiveness(v, attack, [defense])
    if (old !== typeEffectiveness(vi, attack, [defense])) changed.push(`${attack}/${defense}`)
    assert.equal(effectiveness(attack as Parameters<typeof effectiveness>[0], [defense as Parameters<typeof effectiveness>[0]]), old)
  }
  assert.deepEqual(changed, ['ghost/steel', 'dark/steel'])
  assert.equal(typeEffectiveness(v, 'ghost', ['steel']), 0.5)
  assert.equal(typeEffectiveness(vi, 'ghost', ['steel']), 1)
  assert.equal(v.types.length, 17)
  assert.equal(effectiveness('fire', []), 1)
  assert.equal(vi.types.length, 18)
  assert.throws(() => typeEffectiveness(v, 'fairy', ['dragon']))
})

test('Fairy offense and defense match the XY chart, including every neutral matchup', () => {
  const offense: Record<string, number> = { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 }
  const defense: Record<string, number> = { poison: 2, steel: 2, fighting: 0.5, bug: 0.5, dark: 0.5, dragon: 0 }
  for (const type of vi.types) {
    assert.equal(typeEffectiveness(vi, 'fairy', [type]), offense[type] ?? 1, `Fairy → ${type}`)
    assert.equal(typeEffectiveness(vi, type, ['fairy']), defense[type] ?? 1, `${type} → Fairy`)
  }
})

test('dual types compose weaknesses, resistance and immunity in either order', () => {
  assert.equal(typeEffectiveness(vi, 'steel', ['rock', 'fairy']), 4)
  assert.equal(typeEffectiveness(vi, 'fighting', ['bug', 'fairy']), 0.25)
  assert.equal(typeEffectiveness(vi, 'poison', ['steel', 'fairy']), 0)
  assert.equal(typeEffectiveness(vi, 'poison', ['fairy', 'steel']), 0)
  assert.equal(typeEffectiveness(vi, 'dragon', ['dragon', 'fairy']), 0)
  assert.equal(typeEffectiveness(vi, 'fire', ['steel', 'water']), 1)
  assert.throws(() => typeEffectiveness(vi, 'stellar', ['normal']))
  assert.throws(() => typeEffectiveness(vi, 'normal', ['stellar']))
})

test('team analysis partitions all 18 rows and deduplicates STAB coverage', () => {
  const team = [
    { id: 700, name: 'sylveon', types: ['fairy'], sprite: null },
    { id: 707, name: 'klefki', types: ['steel', 'fairy'], sprite: null },
    { id: 715, name: 'noivern', types: ['flying', 'dragon'], sprite: null },
  ]
  const rows = typeDefense(vi, team)
  assert.equal(rows.length, 18)
  for (const row of rows) assert.equal(row.weak + row.neutral + row.resistant + row.immune, team.length)
  assert.deepEqual(rows.find(row => row.type === 'dragon')!.members.map(row => row.multiplier), [0, 0, 2])
  assert.deepEqual(rows.find(row => row.type === 'poison')!.members.map(row => row.multiplier), [2, 0, 1])
  const coverage = typeCoverage(vi, ['fairy', 'fairy', 'steel'])
  assert.equal(coverage.length, 18)
  assert.deepEqual(coverage.find(row => row.type === 'dragon')!.attackers, ['fairy'])
  assert.deepEqual(coverage.find(row => row.type === 'fairy')!.attackers, ['steel'])
  assert.ok(typeCoverage(vi, []).every(row => row.attackers.length === 0))
  assert.ok(typeDefense(vi, []).every(row => row.members.length === 0))
})
