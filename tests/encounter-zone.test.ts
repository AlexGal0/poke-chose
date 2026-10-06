import test from 'node:test'
import assert from 'node:assert/strict'
import { loadEncounterZone, saveEncounterZone } from '../src/storage/encounter-zone.ts'

test('remembers the last selected zone and falls back for invalid or unavailable storage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let stored: string | null = null
  let blocked = false
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => { if (blocked) throw new Error('blocked'); return stored },
    setItem: (_key: string, value: string) => { if (blocked) throw new Error('blocked'); stored = value },
  } })
  try {
    assert.equal(loadEncounterZone(), 358)
    assert.equal(saveEncounterZone(376), true)
    assert.equal(loadEncounterZone(), 376)
    assert.equal(saveEncounterZone(379), true)
    assert.equal(loadEncounterZone(), 379)
    for (const invalid of ['null', '"376"', '393', '425', '0', '429', '376.5', '{broken']) {
      stored = invalid
      assert.equal(loadEncounterZone(), 358)
    }
    assert.equal(saveEncounterZone(425), false)
    blocked = true
    assert.equal(loadEncounterZone(), 358)
    assert.equal(saveEncounterZone(376), false)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
