import test from 'node:test'
import assert from 'node:assert/strict'
import { battleTypeMatchup, battleWeaknesses, battleTypeAdvantage, battleResistances } from '../src/domain/battle-type-matchup.ts'

test('battle arrows evaluate each attack type separately in the correct direction', () => {
  assert.deepEqual(battleTypeMatchup(['water', 'ground'], ['fire', 'flying']), {
    outgoing: [{ type: 'water', multiplier: 2 }, { type: 'ground', multiplier: 0 }],
    incoming: [{ type: 'fire', multiplier: 0.5 }, { type: 'flying', multiplier: 1 }],
  })
})

test('battle arrows preserve dual-type effects and Generation V Steel resistances', () => {
  assert.equal(battleTypeMatchup(['ice'], ['dragon', 'flying']).outgoing[0].multiplier, 4)
  assert.equal(battleTypeMatchup(['grass'], ['bug', 'steel']).outgoing[0].multiplier, 0.25)
  assert.equal(battleTypeMatchup(['ghost', 'dark'], ['steel']).outgoing.every(row => row.multiplier === 0.5), true)
})

test('battle weaknesses list all super-effective attack types, multiplying dual types without Fairy', () => {
  assert.deepEqual(battleWeaknesses(['electric']), [{ type: 'ground', multiplier: 2 }])
  assert.deepEqual(battleWeaknesses(['water', 'ground']), [{ type: 'grass', multiplier: 4 }])
  assert.deepEqual(battleWeaknesses(['bug', 'steel']), [{ type: 'fire', multiplier: 4 }])
  assert.deepEqual(battleWeaknesses(['ghost', 'dark']), [], 'no Fairy weakness in Generation V')
  assert.deepEqual(battleWeaknesses(['poison']), [{ type: 'ground', multiplier: 2 }, { type: 'psychic', multiplier: 2 }])
})

test('team matchup compares the best type attack in both directions and preserves mutual risks', () => {
  assert.deepEqual(battleTypeAdvantage(['water'], ['fire']), { status: 'advantage', outgoing: 2, incoming: 0.5 })
  assert.deepEqual(battleTypeAdvantage(['water'], ['grass']), { status: 'disadvantage', outgoing: 0.5, incoming: 2 })
  assert.deepEqual(battleTypeAdvantage(['normal'], ['water']), { status: 'neutral', outgoing: 1, incoming: 1 })
  assert.deepEqual(battleTypeAdvantage(['fire'], ['grass', 'ground']), { status: 'mutual', outgoing: 2, incoming: 2 })
  assert.deepEqual(battleTypeAdvantage(['ground'], ['electric']), { status: 'advantage', outgoing: 2, incoming: 0 })
  assert.deepEqual(battleTypeAdvantage(['rock'], ['normal']), { status: 'advantage', outgoing: 1, incoming: 0.5 }, 'defensive resistance can give an advantage')
  assert.equal(battleTypeAdvantage(['water', 'ground'], ['fire']).outgoing, 2, 'does not multiply distinct attacking types together')
})

test('strengths include resistances and immunities with Generation V Steel and dual-type rules', () => {
  assert.deepEqual(battleResistances(['normal']), [{ type: 'ghost', multiplier: 0 }])
  const steel = battleResistances(['steel'])
  assert.equal(steel.find(row => row.type === 'ghost')?.multiplier, 0.5)
  assert.equal(steel.find(row => row.type === 'dark')?.multiplier, 0.5)
  assert.equal(steel.find(row => row.type === 'poison')?.multiplier, 0)
  assert.equal(battleResistances(['bug', 'steel']).find(row => row.type === 'grass')?.multiplier, 0.25)
  assert.equal(battleResistances(['water', 'ground']).find(row => row.type === 'electric')?.multiplier, 0)
  assert.ok(battleResistances(['water', 'ground']).every(row => row.multiplier < 1))
})
