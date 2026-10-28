import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readXMemoryBattleFormat, X_BATTLE_FORMAT_HANDLERS, X_BATTLE_FORMAT_SELECTOR } from '../src/games/x/memory-battle-format.ts'
import { X_BATTLE_STATE_ADDRESS } from '../src/games/x/memory-battle.ts'
import { GENERAL_COMBAT_POSITIONS } from '../src/games/core/combat.ts'
import type { GeneralCombatFormat } from '../src/games/core/combat.ts'

function fixture(format: GeneralCombatFormat) {
  const handler = X_BATTLE_FORMAT_HANDLERS[format]
  const words = new Map<number, number>([
    [X_BATTLE_STATE_ADDRESS, 0x40001], [X_BATTLE_FORMAT_SELECTOR, handler.selector],
    [handler.ownInstruction, (0xe3a03000 | GENERAL_COMBAT_POSITIONS[format][0]) >>> 0],
    [handler.enemyInstruction, (0xe3a03000 | GENERAL_COMBAT_POSITIONS[format][1]) >>> 0],
  ])
  const reader = { async read(address: number, length: number) {
    assert.equal(length, 4)
    const value = words.get(address)
    assert.notEqual(value, undefined, 'only bounded known profile addresses are read')
    const buffer = Buffer.alloc(4); buffer.writeUInt32LE(value!); return buffer
  } }
  return { words, reader }
}

test('X recognizes individual, double and horde from their layout handlers and code-declared positions', async () => {
  for (const format of ['single', 'double', 'horde'] as const) {
    const f = fixture(format)
    assert.deepEqual(await readXMemoryBattleFormat(f.reader), { format, positions: GENERAL_COMBAT_POSITIONS[format] })
  }
})

test('outside battle and unknown handlers never fall back to individual or use roster sizes', async () => {
  const f = fixture('horde')
  f.words.set(X_BATTLE_STATE_ADDRESS, 0x40000)
  assert.equal(await readXMemoryBattleFormat(f.reader), null)
  f.words.set(X_BATTLE_STATE_ADDRESS, 0x40001)
  f.words.set(X_BATTLE_FORMAT_SELECTOR, 0x006b0000)
  assert.equal(await readXMemoryBattleFormat(f.reader), null)
})

test('unexpected code, truncated reads and a transition during sampling are rejected', async () => {
  const f = fixture('double')
  f.words.set(X_BATTLE_FORMAT_HANDLERS.double.enemyInstruction, 0xe3a03005)
  await assert.rejects(readXMemoryBattleFormat(f.reader), /instructions disagree/)
  await assert.rejects(readXMemoryBattleFormat({ async read() { return Buffer.alloc(3) } }), /Incomplete/)
  const g = fixture('single'); let reads = 0
  await assert.rejects(readXMemoryBattleFormat({ async read(address, length) {
    if (address === X_BATTLE_FORMAT_SELECTOR && ++reads > 1) g.words.set(address, X_BATTLE_FORMAT_HANDLERS.double.selector)
    return g.reader.read(address, length)
  } }), /changed during read/)
})
