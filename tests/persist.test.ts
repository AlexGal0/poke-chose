import test from 'node:test'
import assert from 'node:assert/strict'
import { persistValue } from '../src/storage/persist.ts'
import { loadEncounterZone, saveEncounterZone } from '../src/storage/encounter-zone.ts'

test('full storage frees only enough disposable cache and restores the selected zone', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map([
    ['poke-chose:bw:v1', 'collection'],
    ['poke-chose:black:encounter-access:v1', 'preferences'],
    ['unrelated', 'data'],
    ['poke-chose:cache:large', 'x'.repeat(200)],
    ['poke-chose:cache:small', 'x'.repeat(10)],
  ])
  let mode = 'quota'
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    get length() { return values.size },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => { values.delete(key) },
    setItem: (key: string, value: string) => {
      if (mode === 'blocked') throw new DOMException('blocked', 'SecurityError')
      if (mode === 'quota' && values.has('poke-chose:cache:large')) throw new DOMException('full', 'QuotaExceededError')
      values.set(key, value)
    },
  } })
  try {
    assert.equal(saveEncounterZone(376), true)
    assert.equal(loadEncounterZone(), 376)
    assert.equal(values.has('poke-chose:cache:large'), false)
    assert.equal(values.has('poke-chose:cache:small'), true)
    assert.equal(values.get('poke-chose:bw:v1'), 'collection')
    assert.equal(values.get('poke-chose:black:encounter-access:v1'), 'preferences')
    assert.equal(values.get('unrelated'), 'data')
    mode = 'blocked'
    const before = [...values]
    assert.equal(persistValue('new', 'value'), false)
    assert.deepEqual([...values], before)
    mode = 'available'
    assert.equal(saveEncounterZone(379), true)
    assert.equal(loadEncounterZone(), 379)
    assert.equal(values.has('poke-chose:cache:small'), true)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
