import test from 'node:test'
import assert from 'node:assert/strict'
import { consistentHeldItem } from '../src/domain/enemy-prototype.ts'
import { normalizeBlackBattle } from '../src/games/black/battle-source.ts'
import { normalizeXBattle } from '../src/games/x/battle-source.ts'
import { isBattleReading } from '../src/models/battle.ts'

const enemy = { address: '0x02000000', speciesId: 568, form: 0, level: 19, personality: 1, trainerId: 2, heldItemId: 234 }
test('Black held items preserve empty versus unknown and disagreements do not hide identity', () => {
  for (const id of [0, 234]) assert.equal(consistentHeldItem([{ ...enemy, heldItemId: id }, { ...enemy, heldItemId: id }]), id)
  for (const id of [null, undefined, -1, 1.5, 65536]) assert.equal(consistentHeldItem([{ ...enemy, heldItemId: id }, { ...enemy, heldItemId: id }]), null)
  const snapshot = { status: 'ready', message: 'active', updatedAt: null, candidates: [enemy, enemy] }
  assert.equal(normalizeBlackBattle(snapshot).enemy?.heldItemId, 234)
  const partial = normalizeBlackBattle({ ...snapshot, candidates: [enemy, { ...enemy, heldItemId: 0 }] })
  assert.equal(partial.enemy?.speciesId, 568)
  assert.equal(partial.enemy?.heldItemId, null)
})
test('X transports held items and validates indices with older snapshots supported', () => {
  const reading = { active: true, own: null, enemy: { identity: '568:1:2', speciesId: 568, form: 0, level: 19, currentHp: 22, maxHp: 80, partySlot: 0, heldItemId: 234 } }
  assert.equal(isBattleReading(reading, 721), true)
  assert.equal(normalizeXBattle(reading, 'ready', []).enemy?.heldItemId, 234)
  assert.equal(isBattleReading({ ...reading, enemy: { ...reading.enemy, heldItemId: -1 } }, 721), false)
  assert.equal(isBattleReading({ ...reading, enemy: { ...reading.enemy, heldItemId: undefined } }, 721), true)
})

test('X field reader carries each held item through field and legacy contracts', async () => {
  const { xBattleFieldFixture } = await import('./helpers/x-battle-field-fixture.ts')
  const { readXMemoryBattleField } = await import('../src/games/x/memory-battle-field.ts')
  const f = xBattleFieldFixture('horde')
  const result = await readXMemoryBattleField(f.reader, f.party)
  const positions = result.field!.sides[1].positions
  assert.equal(positions.length, 5)
  for (const position of positions) {
    assert.equal(position.state, 'occupied')
    if (position.state === 'occupied') assert.equal(typeof position.pokemon.heldItemId, 'number')
  }
  assert.equal(result.enemy!.heldItemId, positions[0].state === 'occupied' ? positions[0].pokemon.heldItemId : null)
})

test('own Black participant uses the same held-item contract and clears disagreeing items', () => {
  const own = { ...enemy, slot: 1, battleSlot: 0 }
  const snapshot = { status: 'ready', message: 'active', updatedAt: null, candidates: [enemy, enemy], activeCandidates: [own, own] }
  assert.equal(normalizeBlackBattle(snapshot).own?.heldItemId, 234)
  assert.equal(normalizeBlackBattle({ ...snapshot, activeCandidates: [own, { ...own, heldItemId: 0 }] }).own?.heldItemId, null)
  assert.equal(normalizeBlackBattle({ ...snapshot, activeCandidates: [{ ...own, heldItemId: 0 }, { ...own, heldItemId: 0 }] }).own?.heldItemId, 0)
})
test('own X field participant retains its held item when normalized', async () => {
  const { xBattleFieldFixture } = await import('./helpers/x-battle-field-fixture.ts')
  const { readXMemoryBattleField } = await import('../src/games/x/memory-battle-field.ts')
  const { normalizeXFieldBattle } = await import('../src/games/x/battle-source.ts')
  const f = xBattleFieldFixture('single')
  const result = await readXMemoryBattleField(f.reader, f.party)
  assert.equal(result.own?.heldItemId, f.party[0].heldItemId)
  assert.equal(normalizeXBattle(result, 'ready', []).own?.heldItemId, f.party[0].heldItemId)
  const normalized = normalizeXFieldBattle(result, 'ready', [])
  const position = normalized.field!.sides[0].positions[0]
  assert.equal(position.state === 'occupied' ? position.pokemon.heldItemId : null, f.party[0].heldItemId)
})
