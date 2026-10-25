import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analysisMembers, collectionAlternatives, isAnalysisFainted } from '../src/domain/team-options.ts'
import { generationVRules as v, generationVIRules as vi } from '../src/domain/type-rules.ts'
import type { AnalysisPokemon } from '../src/domain/type-analysis.ts'

const pokemon = (id: number, types: string[], extra: Partial<AnalysisPokemon> = {}): AnalysisPokemon => ({ id, name: `species-${id}`, types, sprite: null, ...extra })

test('analysis excludes eggs and only excludes confirmed fainted members when requested', () => {
  const members = [
    pokemon(1, ['grass'], { isEgg: true }),
    pokemon(4, ['fire'], { currentHp: 0, maxHp: 20 }),
    pokemon(7, ['water'], { currentHp: 1, maxHp: 20 }),
    pokemon(25, ['electric']),
    pokemon(16, ['normal', 'flying'], { currentHp: 0 }),
    pokemon(19, ['normal'], { currentHp: 0, maxHp: 0 }),
  ]
  assert.deepEqual(analysisMembers(members, true).map(row => row.id), [4, 7, 25, 16, 19])
  assert.deepEqual(analysisMembers(members, false).map(row => row.id), [7, 25, 16, 19])
  assert.equal(isAnalysisFainted(members[0]), false)
  assert.equal(isAnalysisFainted(members[1]), true)
  assert.equal(isAnalysisFainted(members[4]), false)
  assert.equal(members.length, 6)
})

test('collection alternatives respect discovery, eggs, fainted options and actual instance identity', () => {
  const team = [pokemon(4, ['fire'], { instanceKey: 'party-1' }), pokemon(5, ['fire'], { instanceKey: 'party-2' })]
  const water = pokemon(7, ['water'], { instanceKey: 'water' })
  const egg = pokemon(25, ['electric'], { isEgg: true })
  const fainted = pokemon(1, ['grass'], { currentHp: 0, maxHp: 30 })
  const hidden = pokemon(74, ['rock', 'ground'])
  const collection = [...team, water, egg, fainted, hidden]
  const known = new Set([1, 4, 5, 7, 25])
  const all = collectionAlternatives(vi, team, collection, known, true)
  assert.deepEqual(new Set(all.map(row => row.pokemon.id)), new Set([1, 7]))
  assert.deepEqual(collectionAlternatives(vi, team, collection, known, false).map(row => row.pokemon.id), [7])
  assert.ok(all.find(row => row.pokemon.id === 1)!.resists.includes('water'))
  assert.ok(all.find(row => row.pokemon.id === 7)!.coverage.includes('ground'))
  assert.ok(all.every(row => row.score === row.resists.length * 2 + row.coverage.length))
  assert.deepEqual(collectionAlternatives(vi, team, collection, new Set(), true), [])
  assert.deepEqual(collectionAlternatives(vi, [], collection, known, true), [])
})

test('fainted exclusion recalculates weaknesses and coverage without recommending original party members', () => {
  const team = [pokemon(4, ['fire'], { currentHp: 0, maxHp: 20 }), pokemon(7, ['water'])]
  const grass = pokemon(1, ['grass'])
  const withFainted = collectionAlternatives(vi, team, [...team, grass], new Set([1, 4, 7]), true)
  const healthyOnly = collectionAlternatives(vi, team, [...team, grass], new Set([1, 4, 7]), false)
  assert.equal(withFainted[0].pokemon.id, 1)
  assert.equal(healthyOnly[0].pokemon.id, 1)
  assert.ok(healthyOnly.every(row => row.pokemon.id !== 4))
  const benchFire = pokemon(5, ['fire'])
  assert.equal(collectionAlternatives(vi, team, [benchFire], new Set([5]), true).length, 0)
  assert.ok(collectionAlternatives(vi, team, [benchFire], new Set([5]), false)[0].coverage.includes('ice'))
  assert.deepEqual(collectionAlternatives(vi, [team[0]], [...team, grass], new Set([1, 4, 7]), false), [])
})

test('alternatives use the injected generation rules and preserve separate duplicate individuals', () => {
  const team = [pokemon(25, ['electric'], { instanceKey: 'a' }), pokemon(26, ['electric'], { instanceKey: 'b' })]
  const copies = [pokemon(92, ['ghost'], { instanceKey: 'box-1' }), pokemon(92, ['ghost'], { instanceKey: 'box-2' })]
  const old = collectionAlternatives(v, team, copies, new Set([92]), true)
  const current = collectionAlternatives(vi, team, copies, new Set([92]), true)
  assert.equal(old.length, 2)
  assert.equal(current.length, 2)
  assert.ok(!old[0].coverage.includes('steel'))
  // Ghost is neutral against Steel in VI; it must not become super-effective coverage.
  assert.ok(!current[0].coverage.includes('steel'))
  assert.ok(current[0].coverage.includes('psychic'))
  assert.deepEqual(current.map(row => row.pokemon.instanceKey), ['box-1', 'box-2'])
  const fairy = collectionAlternatives(vi, team, [pokemon(700, ['fairy'])], new Set([700]), true)
  assert.ok(fairy[0].coverage.includes('dragon'))
  assert.throws(() => collectionAlternatives(v, team, [pokemon(700, ['fairy'])], new Set([700]), true))
  const psychicTeam = [pokemon(96, ['psychic']), pokemon(97, ['psychic'])]
  const steel = [pokemon(81, ['electric', 'steel'])]
  const oldResists = collectionAlternatives(v, psychicTeam, steel, new Set([81]), true)[0].resists
  const newResists = collectionAlternatives(vi, psychicTeam, steel, new Set([81]), true)[0].resists
  assert.ok(oldResists.includes('ghost') && oldResists.includes('dark'))
  assert.ok(!newResists.includes('ghost') && !newResists.includes('dark'))
  assert.ok(newResists.includes('bug'))
})
