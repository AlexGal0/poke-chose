import test from 'node:test'
import assert from 'node:assert/strict'
import { loadFollowLocation, saveFollowLocation } from '../src/storage/follow-location.ts'

test('follow preference defaults off, persists both values and tolerates blocked storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let value: string | null = null
  let blocked = false
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => { if (blocked) throw new Error('blocked'); return value },
    setItem: (_key: string, next: string) => { if (blocked) throw new Error('blocked'); value = next },
  } })
  try {
    assert.equal(loadFollowLocation(), false)
    assert.equal(saveFollowLocation(true), true)
    assert.equal(loadFollowLocation(), true)
    assert.equal(saveFollowLocation(false), true)
    assert.equal(loadFollowLocation(), false)
    for (const invalid of ['1', '"true"', '{}', 'null', 'broken']) {
      value = invalid
      assert.equal(loadFollowLocation(), false)
    }
    blocked = true
    assert.equal(loadFollowLocation(), false)
    assert.equal(saveFollowLocation(true), false)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
