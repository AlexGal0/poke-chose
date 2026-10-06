import { test } from 'node:test'
import assert from 'node:assert/strict'
import { areaLabel, orderBlackZones, searchBlackZones, zoneLabel, zoneStage } from '../src/domain/black-zones.ts'
import { blackLocations } from '../src/api/encounters.ts'

const locations = [
  { id: 366, name: 'unova-route-11' },
  { id: 351, name: 'nimbasa-city' },
  { id: 356, name: 'unova-route-1' },
  { id: 375, name: 'pinwheel-forest' },
  { id: 348, name: 'striaton-city' },
  { id: 374, name: 'dreamyard' },
  { id: 371, name: 'unova-route-16' },
]

test('first-visit order interleaves towns, routes and dungeons; optional and postgame zones remain distinct', () => {
  assert.deepEqual(orderBlackZones(locations).map(row => row.id), [356, 348, 374, 375, 351, 371, 366])
  assert.equal(locations[0].id, 366)
  assert.equal(zoneStage({ id: 371, name: '' }), 'Opcionales')
  assert.equal(zoneStage({ id: 366, name: '' }), 'Después de la Liga')
})

test('Spanish game names are proper names, not literal translations of English', () => {
  assert.equal(zoneLabel({ id: 374, name: 'dreamyard' }), 'Solar de los Sueños')
  assert.equal(zoneLabel({ id: 351, name: 'nimbasa-city' }), 'Ciudad Mayólica')
  assert.equal(zoneLabel({ id: 379, name: 'chargestone-cave' }), 'Cueva Electrorroca')
  assert.equal(areaLabel('wellspring-cave-b1f'), 'Cueva Manantial · Sótano 1')
  assert.equal(areaLabel('pinwheel-forest-outside'), 'Bosque Azulejo · Exterior')
})

test('zone search ignores accents/case, supports official names and retains game order', () => {
  const ordered = orderBlackZones(locations)
  assert.deepEqual(searchBlackZones(ordered, ' MAYOLICA ').map(row => row.id), [351])
  assert.deepEqual(searchBlackZones(ordered, 'suenos').map(row => row.id), [374])
  assert.deepEqual(searchBlackZones(ordered, 'ruta 1').map(row => row.id), [356, 371, 366])
  assert.deepEqual(searchBlackZones(ordered, 'despues liga').map(row => row.id), [366])
  assert.deepEqual(searchBlackZones(ordered, 'sin coincidencias'), [])
  assert.deepEqual(searchBlackZones(ordered, ''), ordered)
})

test('all original BW Black location resources have a verified Spanish label; White zones stay excluded', () => {
  const resources = Array.from({ length: 83 }, (_, index) => ({ name: 'resource', url: `https://pokeapi.co/api/v2/location/${346 + index}/` }))
  const rows = blackLocations(resources)
  assert.equal(rows.length, 81)
  assert.equal(rows.some(row => row.id === 393 || row.id === 425), false)
  for (const row of rows) assert.notEqual(zoneLabel(row), 'Zona sin nombre verificado', `Missing Spanish name for ${row.id}`)
})
