import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orderBlackZones, searchBlackZones, zoneStage } from '../src/domain/black-zones.ts'
import type { ZoneStage } from '../src/domain/black-zones.ts'
import { blackLocations } from '../src/api/encounters.ts'
import i18n from '../src/i18n/index.ts'
import { areaLabel, stageLabel, zoneLabel } from '../src/i18n/zones.ts'

const t = i18n.getFixedT('es')
const searchText = (location: { id: number; name: string }) => `${zoneLabel(t, location)} ${location.name} ${stageLabel(t, zoneStage(location))}`

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
  const optional: ZoneStage = 'optional'
  const postLeague: ZoneStage = 'postLeague'
  assert.equal(zoneStage({ id: 371, name: '' }), optional)
  assert.equal(zoneStage({ id: 366, name: '' }), postLeague)
})

test('zone and area labels resolve from translation resources, not literal translations of English', () => {
  assert.equal(zoneLabel(t, { id: 374, name: 'dreamyard' }), 'Solar de los Sueños')
  assert.equal(zoneLabel(t, { id: 351, name: 'nimbasa-city' }), 'Ciudad Mayólica')
  assert.equal(zoneLabel(t, { id: 379, name: 'chargestone-cave' }), 'Cueva Electrorroca')
  assert.equal(areaLabel(t, 'wellspring-cave-b1f'), 'Cueva Manantial · Sótano 1')
  assert.equal(areaLabel(t, 'pinwheel-forest-outside'), 'Bosque Azulejo · Exterior')
})

test('zone search ignores accents/case, supports official names and retains game order', () => {
  const ordered = orderBlackZones(locations)
  assert.deepEqual(searchBlackZones(ordered, ' MAYOLICA ', searchText).map(row => row.id), [351])
  assert.deepEqual(searchBlackZones(ordered, 'suenos', searchText).map(row => row.id), [374])
  assert.deepEqual(searchBlackZones(ordered, 'ruta 1', searchText).map(row => row.id), [356, 371, 366])
  assert.deepEqual(searchBlackZones(ordered, 'despues liga', searchText).map(row => row.id), [366])
  assert.deepEqual(searchBlackZones(ordered, 'sin coincidencias', searchText), [])
  assert.deepEqual(searchBlackZones(ordered, '', searchText), ordered)
})

test('all original BW Black location resources have a real translated label in both locales; White zones stay excluded', () => {
  const resources = Array.from({ length: 83 }, (_, index) => ({ name: 'resource', url: `https://pokeapi.co/api/v2/location/${346 + index}/` }))
  const rows = blackLocations(resources)
  assert.equal(rows.length, 81)
  assert.equal(rows.some(row => row.id === 393 || row.id === 425), false)
  const tEn = i18n.getFixedT('en')
  const esFallback = t('zones.noNameVerified')
  const enFallback = tEn('zones.noNameVerified')
  for (const row of rows) {
    assert.notEqual(zoneLabel(t, row), esFallback, `Missing es label for ${row.id}`)
    assert.notEqual(zoneLabel(tEn, row), enFallback, `Missing en label for ${row.id}`)
  }
})
