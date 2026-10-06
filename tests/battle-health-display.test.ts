import test from 'node:test'
import assert from 'node:assert/strict'
import { updateBattleHealthDisplay } from '../src/domain/battle-health-display.ts'
import type { BattleHealthDisplay } from '../src/domain/battle-health-display.ts'

test('battle display retains confirmed HP across missing readings and detects damage once', () => {
  const initial: BattleHealthDisplay = { identity: 'marty', health: null, hit: 0, damageFraction: 0 }
  const full = updateBattleHealthDisplay(initial, 'marty', { currentHp: 62, maxHp: 62 })
  assert.equal(full.hit, 0, 'initial HP does not trigger an impact')
  assert.equal(updateBattleHealthDisplay(full, 'marty', null), full)
  const damaged = updateBattleHealthDisplay(full, 'marty', { currentHp: 10, maxHp: 62 })
  assert.equal(damaged.hit, 1)
  assert.equal(damaged.damageFraction, 52 / 62)
  assert.equal(updateBattleHealthDisplay(damaged, 'marty', null), damaged)
  assert.equal(updateBattleHealthDisplay(damaged, 'marty', { currentHp: 10, maxHp: 62 }), damaged)
  const healed = updateBattleHealthDisplay(damaged, 'marty', { currentHp: 30, maxHp: 62 })
  assert.equal(healed.hit, 1, 'healing does not trigger another impact')
  const fainted = updateBattleHealthDisplay(healed, 'marty', { currentHp: 0, maxHp: 62 })
  assert.equal(fainted.hit, 2)
  assert.equal(fainted.health?.currentHp, 0)
})

test('switching individuals clears retained HP and does not animate damage from the old participant', () => {
  const previous = { identity: 'marty', health: { currentHp: 62, maxHp: 62 }, hit: 1, damageFraction: 0.5 }
  assert.deepEqual(updateBattleHealthDisplay(previous, 'dewott', null), { identity: 'dewott', health: null, hit: 0, damageFraction: 0 })
  const switched = updateBattleHealthDisplay(previous, 'dewott', { currentHp: 20, maxHp: 91 })
  assert.equal(switched.hit, 0)
  const leveled = updateBattleHealthDisplay(previous, 'marty', { currentHp: 61, maxHp: 65 })
  assert.equal(leveled.hit, 1, 'a max HP change is not treated as damage')
})
