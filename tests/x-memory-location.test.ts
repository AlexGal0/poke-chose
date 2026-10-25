import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readXMemoryLocation, X_LOCATION_ADDRESS, X_LOCATION_COPY_ADDRESS } from '../src/games/x/memory-location.ts'
import { xCaptureLocation, resolveXMapZone } from '../src/games/x/capture-location.ts'
import { xEncounters } from '../src/games/x/encounters.ts'
import mapData from '../src/games/x/data/map-zones.json' with { type: 'json' }
import { emptyLivePartySnapshot, isLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'
import { advanceCaptureZone } from '../src/domain/capture-location.ts'

function reader(mapId = 266, duplicate = mapId, direction = 0, x = 9873) {
  return { async read(address: number) {
    if (address === X_LOCATION_COPY_ADDRESS) { const copy = Buffer.alloc(2); copy.writeUInt16LE(duplicate); return copy }
    assert.equal(address, X_LOCATION_ADDRESS)
    const data = Buffer.alloc(28)
    data.writeUInt16LE(mapId)
    data[2] = direction
    data.writeFloatLE(x, 16); data.writeFloatLE(-72, 20); data.writeFloatLE(13520, 24)
    return data
  } }
}

test('X position requires matching stable copies and valid player fields, including map zero', async () => {
  assert.deepEqual(await readXMemoryLocation(reader()), { mapId: 266 })
  assert.deepEqual(await readXMemoryLocation(reader(0)), { mapId: 0 })
  for (const invalid of [reader(266, 45), reader(5000), reader(266, 266, 255), reader(266, 266, 0, NaN)]) await assert.rejects(readXMemoryLocation(invalid))
  await assert.rejects(readXMemoryLocation({ read: async () => new Uint8Array(1) }))
  let sample = 0
  await assert.rejects(readXMemoryLocation({ read: async (address: number) => {
    if (address === X_LOCATION_ADDRESS) sample++
    return reader(sample === 1 ? 266 : 45).read(address)
  } }))
})

test('all 360 documented X maps resolve to registered atlas zones and group city interiors', () => {
  assert.equal(mapData.maps.length, 360)
  assert.equal(new Set(mapData.maps.map(row => row.mapId)).size, 360)
  for (const row of mapData.maps) assert.ok(xEncounters.locations.some(zone => zone.id === row.zoneId))
  assert.equal(resolveXMapZone(45), 614)
  assert.equal(resolveXMapZone(48), 614)
  assert.equal(resolveXMapZone(266), 612)
  assert.equal(resolveXMapZone(0), 587)
  for (const invalid of [-1, 999, NaN, 0.5]) assert.equal(resolveXMapZone(invalid), null)
})

test('X enables following only for negotiated live readings and retains the confirmed area on uncertainty', () => {
  const snapshot = { ...emptyLivePartySnapshot(), status: 'ready' as const, enabled: true, position: { mapId: 266 } }
  const reading = xCaptureLocation('live', snapshot)
  assert.equal(reading.available, true)
  assert.equal(reading.zoneId, 612)
  assert.equal(reading.stale, false)
  const confirmed = advanceCaptureZone({ scope: reading.scope, zoneId: null }, reading, true, () => true)
  for (const next of [{ ...snapshot, position: null }, { ...snapshot, enabled: false }, { ...snapshot, status: 'error' as const }]) {
    assert.equal(advanceCaptureZone(confirmed, xCaptureLocation('live', next), true, () => true).zoneId, 612)
  }
  assert.equal(advanceCaptureZone(confirmed, xCaptureLocation('live', { ...snapshot, position: { mapId: 999 } }), true, () => true).zoneId, 612)
  for (const source of ['save', 'manual'] as const) assert.equal(xCaptureLocation(source, snapshot).available, false)
  assert.equal(xCaptureLocation('live', { ...snapshot, capabilities: { party: true, boxes: true, pokedex: true } }).available, false)
})

test('live protocol accepts optional location extension and rejects malformed or unnegotiated maps', () => {
  const initial = emptyLivePartySnapshot()
  assert.equal(isLivePartySnapshot(initial), true)
  assert.equal(isLivePartySnapshot({ ...initial, position: { mapId: 0 } }), true)
  assert.equal(isLivePartySnapshot({ ...initial, position: { mapId: 266 } }), true)
  for (const position of [{ mapId: -1 }, { mapId: NaN }, { mapId: 1.5 }, { mapId: 65536 }, { mapId: '266' }]) assert.equal(isLivePartySnapshot({ ...initial, position }), false)
  assert.equal(isLivePartySnapshot({ ...initial, capabilities: { ...initial.capabilities, location: false } }), false)
  const legacy = { ...initial, position: undefined, capabilities: { party: true, boxes: true, pokedex: true } }
  assert.equal(isLivePartySnapshot(legacy), true)
  assert.equal(isLivePartySnapshot({ ...legacy, position: { mapId: 266 } }), false)
})
