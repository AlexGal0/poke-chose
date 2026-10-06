import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encounterMethod, encounterMethods } from '../src/domain/encounter-methods.ts'
import { accessibleEncounters } from '../src/domain/encounter-access.ts'
import type { BlackEncounterDetail } from '../src/models/encounters.ts'

const detail = (method: string): BlackEncounterDetail => ({ method, area: 'test', minLevel: 5, maxLevel: 10, chance: 20, conditions: [] })

test('grass methods remain separate while repeated conditions share a tag', () => {
  const tags = encounterMethods(['walk', 'dark-grass', 'grass-spots', 'walk'].map(detail))
  assert.deepEqual(tags.map(tag => tag.method), ['walk', 'dark-grass', 'grass-spots'])
  assert.equal(new Set(tags.map(tag => tag.label)).size, 3)
  assert.equal(new Set(tags.map(tag => tag.icon)).size, 3)
  assert.match(encounterMethod('walk').description, /cueva/)
})

test('equipment filters remove inaccessible tags and keep other methods of the species', () => {
  const rows = [{ speciesId: 550, name: 'basculin', details: ['gift', 'surf', 'surf-spots', 'super-rod', 'super-rod-spots'].map(detail) }]
  const disabled = accessibleEncounters(rows, { surf: false, superRod: false })
  assert.deepEqual(encounterMethods(disabled[0].details).map(tag => tag.method), ['gift'])
  const enabled = accessibleEncounters(rows, { surf: true, superRod: true })
  assert.equal(encounterMethods(enabled[0].details).length, 5)
  assert.notEqual(encounterMethod('surf').label, encounterMethod('surf-spots').label)
  assert.notEqual(encounterMethod('super-rod').label, encounterMethod('super-rod-spots').label)
})

test('special encounters have readable labels and unknown methods stay visible', () => {
  for (const method of ['cave-spots', 'bridge-spots', 'gift', 'gift-egg', 'static', 'npc-trade']) {
    assert.notEqual(encounterMethod(method).label, method)
    assert.ok(encounterMethod(method).icon)
  }
  assert.equal(encounterMethod('new-method').label, 'new method')
  assert.equal(encounterMethod('constructor').icon, '🔎')
})
