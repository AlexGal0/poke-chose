import test from 'node:test'
import assert from 'node:assert/strict'
import { isCounterpartExclusive, summaryAcquisitionRoutes } from '../src/games/core/acquisition.ts'
import type { AcquisitionAvailability, AcquisitionAccess } from '../src/games/core/acquisition.ts'

test('exclusivity requires confirmed independent availability and confirmed counterpart absence', () => {
  const statuses = ['obtainable', 'unobtainable', 'unknown'] as const
  for (const independent of statuses) for (const other of statuses) {
    const availability: AcquisitionAvailability = { independent, counterpart: { gameId: 'white', gameName: { text: 'Pokémon White' }, independent: other } }
    assert.equal(isCounterpartExclusive(availability), independent === 'obtainable' && other === 'unobtainable')
  }
  assert.equal(isCounterpartExclusive({ independent: 'obtainable', counterpart: null }), false)
})

test('summary retains independent routes, trades and events while details keep all routes', () => {
  const access: (AcquisitionAccess | undefined)[] = ['independent', 'trade', 'event', 'external', 'unknown', undefined]
  const routes = access.map((value, index) => ({ kind: String(index), icon: '?', label: { text: String(index) }, ...(value ? { access: value } : {}) }))
  const original = structuredClone(routes)
  assert.deepEqual(summaryAcquisitionRoutes(routes).map(route => route.access), ['independent', 'trade', 'event'])
  assert.deepEqual(routes, original)
})

test('method names cannot establish access: Safari and ordinary captures can share a kind', () => {
  const routes = [
    { kind: 'capture', icon: '🌿', label: { text: 'Route' }, access: 'independent' as const },
    { kind: 'capture', icon: '🌿', label: { text: 'Friend Safari' }, access: 'external' as const },
  ]
  assert.deepEqual(summaryAcquisitionRoutes(routes), [routes[0]])
})
