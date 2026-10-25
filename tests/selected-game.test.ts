import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSelectedGame, saveSelectedGame } from '../src/storage/selected-game.ts'

test('game selection survives reloads and restarts on the same local day and expires the next day', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } })
  try {
    assert.equal(loadSelectedGame(), null)
    const evening = new Date(2026, 9, 23, 23, 50)
    for (const game of ['black', 'x'] as const) {
      saveSelectedGame(game, evening)
      assert.equal(loadSelectedGame(new Date(2026, 9, 23, 23, 59))?.id, game)
      assert.equal(loadSelectedGame(new Date(2026, 9, 24, 0, 0)), null)
      assert.equal(loadSelectedGame(new Date(2026, 9, 22)), null)
    }
    saveSelectedGame(null)
    assert.equal(loadSelectedGame(evening), null)
    values.set('poke-chose:selected-game:v1', '{broken')
    assert.equal(loadSelectedGame(evening), null)
    values.set('poke-chose:selected-game:v1', JSON.stringify({ game: 'unknown', day: '2026-10-23' }))
    assert.equal(loadSelectedGame(evening), null)
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked') } })
    assert.equal(loadSelectedGame(evening), null)
    assert.doesNotThrow(() => saveSelectedGame('x', evening))
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
