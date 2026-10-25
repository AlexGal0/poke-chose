import { test } from 'node:test'
import assert from 'node:assert/strict'
import { battleDefenses, battleMatchup, battleAdvantage } from '../src/domain/battle-engine.ts'
import { generationVRules as v, generationVIRules as vi } from '../src/domain/type-rules.ts'

test('battle engine receives game rules explicitly and preserves V/VI differences', () => {
  assert.equal(battleMatchup(v, ['ghost'], ['steel']).outgoing[0].multiplier, 0.5)
  assert.equal(battleMatchup(vi, ['ghost'], ['steel']).outgoing[0].multiplier, 1)
  assert.equal(battleMatchup(vi, ['dark'], ['steel']).outgoing[0].multiplier, 1)
  assert.equal(battleMatchup(vi, ['dragon'], ['fairy']).outgoing[0].multiplier, 0)
  assert.deepEqual(battleDefenses(vi, ['dark', 'ghost']).weaknesses, [{ type: 'fairy', multiplier: 2 }])
  assert.deepEqual(battleDefenses(v, ['dark', 'ghost']).weaknesses, [])
})

test('battle engine preserves direction, immunity, fourfold damage and mutual risks', () => {
  assert.deepEqual(battleMatchup(vi, ['water', 'ground'], ['fire', 'flying']), {
    outgoing: [{ type: 'water', multiplier: 2 }, { type: 'ground', multiplier: 0 }],
    incoming: [{ type: 'fire', multiplier: 0.5 }, { type: 'flying', multiplier: 1 }],
  })
  assert.equal(battleMatchup(vi, ['steel'], ['rock', 'fairy']).outgoing[0].multiplier, 4)
  assert.equal(battleDefenses(vi, ['steel', 'fairy']).resistances.find(row => row.type === 'poison')?.multiplier, 0)
  assert.deepEqual(battleAdvantage(vi, ['fire'], ['grass', 'ground']), { status: 'mutual', outgoing: 2, incoming: 2 })
  assert.deepEqual(battleMatchup(vi, ['fighting'], ['water']).outgoing, [{ type: 'fighting', multiplier: 1 }])
  assert.equal(battleMatchup(vi, ['grass', 'poison'], ['water']).outgoing[0].multiplier, 2)
})

test('invalid or unavailable battle types fail explicitly instead of producing an advantage', () => {
  for (const invalid of [[], ['fairy'], ['steel', 'steel'], ['grass', 'fire', 'water']]) {
    assert.throws(() => battleMatchup(v, invalid, ['normal']))
  }
  assert.throws(() => battleDefenses(vi, ['stellar']))
})
