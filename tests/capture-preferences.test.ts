import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCaptureFilters, saveCaptureFilters } from '../src/storage/capture-filters.ts'
import { localBreedingOnly } from '../src/games/core/acquisition.ts'

test('capture preferences survive reloads per game and zone with shared progress and zone search', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } })
  try {
    const first = { zoneId: 1, query: 'water', method: 'surf', progress: 'pending' as const, zoneQuery: 'ruta' }
    assert.equal(saveCaptureFilters('x', first), true)
    assert.equal(saveCaptureFilters('x', { ...first, zoneId: 2, query: 'fire', method: 'walk' }), true)
    assert.equal(loadCaptureFilters('x', 1).query, 'water')
    assert.equal(loadCaptureFilters('x', 2).method, 'walk')
    assert.equal(loadCaptureFilters('x', 3).query, '')
    assert.equal(loadCaptureFilters('x', 3).progress, 'pending')
    assert.equal(loadCaptureFilters('x', 3).zoneQuery, 'ruta')
    assert.equal(loadCaptureFilters('black', 1).progress, 'all')
    values.set('broken', '{broken')
    assert.equal(loadCaptureFilters('broken', 1).method, 'all')
    values.set('invalid', JSON.stringify({ progress: 'unknown', zones: { 1: { query: false, method: 3 } } }))
    assert.equal(loadCaptureFilters('invalid', 1).query, '')
    assert.equal(loadCaptureFilters('invalid', 1).method, 'all')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked') } })
    assert.equal(loadCaptureFilters('x', 1).progress, 'all')
    assert.equal(saveCaptureFilters('x', first), false)
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage') }
})

test('breeding markers require positive breeding data and exclude all direct acquisition routes', () => {
  assert.equal(localBreedingOnly(['breed', 'unknown']), true)
  assert.equal(localBreedingOnly(['unknown'], true), true)
  assert.equal(localBreedingOnly(['unknown']), false)
  assert.equal(localBreedingOnly(['evolution']), false)
  for (const kind of ['capture', 'static', 'gift', 'egg', 'fossil', 'npc-trade']) assert.equal(localBreedingOnly(['breed', kind], true), false)
})
