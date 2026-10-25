import { test } from 'node:test'
import assert from 'node:assert/strict'
import { captureBrowserView, captureZoneNavigation } from '../src/domain/capture-browser.ts'
import { advanceCaptureZone } from '../src/domain/capture-location.ts'
import { blackCaptureLocation } from '../src/games/black/capture-location.ts'
import { xCaptureLocation } from '../src/games/x/capture-location.ts'
import type { CaptureLocationReading } from '../src/models/capture-location.ts'
import type { EncounterSpecies } from '../src/models/encounters.ts'

const rows: EncounterSpecies[] = [
  { speciesId: 280, name: 'ralts', details: [{ area: 'route-4', method: 'walk', minLevel: 8, maxLevel: 10, chance: 5, conditions: [] }] },
  { speciesId: 129, name: 'magikarp', details: [{ area: 'water', method: 'old-rod', minLevel: 5, maxLevel: 5, chance: 100, conditions: [] }] },
]
const pokedex = { seenSpeciesIds: new Set([280, 129]), caughtSpeciesIds: new Set([129]) }

test('shared capture filters count caught flags only and keep access, search and progress independent', () => {
  const all = captureBrowserView(rows, { pokedex })
  assert.equal(all.checklist?.caught, 1)
  assert.equal(all.checklist?.total, 2)
  assert.deepEqual(all.rows.map(row => row.speciesId), [129, 280])
  const searched = captureBrowserView(rows, { pokedex, matches: row => row.speciesId === 280, progress: 'seen' })
  assert.equal(searched.rows.length, 1)
  assert.equal(searched.checklist?.total, 2)
  const grass = captureBrowserView(rows, { pokedex, methods: new Set(['walk']), progress: 'pending' })
  assert.equal(grass.checklist?.caught, 0)
  assert.equal(grass.checklist?.total, 1)
  assert.equal(grass.subzones[0].area, 'route-4')
  assert.equal(captureBrowserView(rows, { pokedex, methods: new Set(['walk']), progress: 'caught' }).rows.length, 0)
  assert.equal(captureBrowserView(rows, { pokedex: null }).checklist, null)
  assert.equal(rows[0].details[0].method, 'walk')
})

test('shared zone navigation preserves adapter itinerary and the current zone during accent-insensitive search', () => {
  const zones = [{ id: 591, name: 'Ruta 2' }, { id: 596, name: 'Ciudad Novarte' }, { id: 599, name: 'Ciudad Luminalia' }]
  const view = captureZoneNavigation(zones, 591, 'novárte ciudad', zone => zone.name)
  assert.deepEqual(view.matching.map(zone => zone.id), [596])
  assert.deepEqual(view.navigation.map(zone => zone.id), [591, 596])
  assert.equal(view.next?.id, 596)
  assert.equal(captureZoneNavigation(zones, 596, 'absent', zone => zone.name).navigation[0].id, 596)
  assert.equal(captureZoneNavigation(zones, 596, '', zone => zone.name).previous?.id, 591)
})

test('normalized zone sessions retain unknown/stale readings and isolate both game and source', () => {
  const valid = (id: number) => [358, 361, 591, 596].includes(id)
  const reading: CaptureLocationReading = { scope: 'black:live', available: true, zoneId: 361, stale: false }
  let state = advanceCaptureZone({ scope: reading.scope, zoneId: null }, reading, true, valid)
  assert.equal(state.zoneId, 361)
  for (let i = 0; i < 30; i++) state = advanceCaptureZone(state, { ...reading, zoneId: i % 2 ? null : 999, stale: i % 2 === 0 }, true, valid)
  assert.equal(state.zoneId, 361)
  assert.equal(advanceCaptureZone(state, { ...reading, zoneId: 358, stale: true }, true, valid).zoneId, 361)
  assert.equal(advanceCaptureZone(state, { ...reading, scope: 'black:save', zoneId: null }, true, valid).zoneId, null)
  assert.equal(advanceCaptureZone(state, { ...reading, scope: 'x:live', zoneId: null }, true, valid).zoneId, null)
  assert.equal(advanceCaptureZone(state, reading, false, valid).zoneId, null)
  assert.equal(advanceCaptureZone(state, { ...reading, available: false }, true, valid).zoneId, null)
  for (const zoneId of [NaN, Infinity, -1, 1.5]) assert.equal(advanceCaptureZone(state, { ...reading, zoneId }, true, () => true).zoneId, 361)
  // A future X adapter can feed the same contract, without changing shared behavior.
  assert.equal(advanceCaptureZone(state, { ...reading, scope: 'x:live', zoneId: 596 }, true, valid).zoneId, 596)
})

test('Black resolves map IDs at its boundary and X explicitly keeps automatic zones unavailable', () => {
  assert.equal(blackCaptureLocation('live', { mapId: 331 }, false, true).reading.zoneId, 361)
  assert.equal(blackCaptureLocation('live', { mapId: 27 }, false, true).reading.zoneId, null)
  assert.equal(blackCaptureLocation('manual', { mapId: 331 }, false, true).reading.available, false)
  assert.equal(blackCaptureLocation('live', { mapId: 331 }, true, true).reading.stale, true)
  for (const source of ['manual', 'save', 'live'] as const) {
    const reading = xCaptureLocation(source)
    assert.equal(reading.available, false)
    assert.equal(reading.zoneId, null)
    assert.equal(advanceCaptureZone({ scope: reading.scope, zoneId: 591 }, reading, true, () => true).zoneId, null)
  }
})
