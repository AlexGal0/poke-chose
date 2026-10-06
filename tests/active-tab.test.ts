import test from 'node:test'
import assert from 'node:assert/strict'
import { loadActiveTab, saveActiveTab } from '../src/storage/active-tab.ts'

test('restores each supported tab and handles missing, corrupt and blocked storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let stored: string | null = null
  let blocked = false
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => { if (blocked) throw new Error('blocked'); return stored },
    setItem: (_key: string, value: string) => { if (blocked) throw new Error('blocked'); stored = value },
  } })
  try {
    assert.equal(loadActiveTab(), 'catalog')
    for (const tab of ['captures', 'collection', 'analysis', 'types', 'catalog', 'battle'] as const) {
      assert.equal(saveActiveTab(tab), true)
      assert.equal(loadActiveTab(), tab)
    }
    for (const invalid of ['"unknown"', '123', '{}', '{broken']) {
      stored = invalid
      assert.equal(loadActiveTab(), 'catalog')
    }
    blocked = true
    assert.equal(saveActiveTab('captures'), false)
    assert.equal(loadActiveTab(), 'catalog')
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
