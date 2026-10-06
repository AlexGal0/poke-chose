import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encounterMethodIcon, encounterMethods, isKnownEncounterMethod } from '../src/domain/encounter-methods.ts'
import { accessibleEncounters } from '../src/domain/encounter-access.ts'
import type { BlackEncounterDetail } from '../src/models/encounters.ts'
import i18n from '../src/i18n/index.ts'
import { methodDescription, methodLabel } from '../src/i18n/encounter-methods.ts'

const t = i18n.getFixedT('es')
const detail = (method: string): BlackEncounterDetail => ({ method, area: 'test', minLevel: 5, maxLevel: 10, chance: 20, conditions: [] })

test('grass methods remain separate while repeated conditions share a tag', () => {
  const tags = encounterMethods(['walk', 'dark-grass', 'grass-spots', 'walk'].map(detail))
  assert.deepEqual(tags.map(tag => tag.method), ['walk', 'dark-grass', 'grass-spots'])
  assert.equal(new Set(tags.map(tag => methodLabel(t, tag.method))).size, 3)
  assert.equal(new Set(tags.map(tag => tag.icon)).size, 3)
  assert.match(methodDescription(t, 'walk'), /cueva/)
})

test('equipment filters remove inaccessible tags and keep other methods of the species', () => {
  const rows = [{ speciesId: 550, name: 'basculin', details: ['gift', 'surf', 'surf-spots', 'super-rod', 'super-rod-spots'].map(detail) }]
  const disabled = accessibleEncounters(rows, { surf: false, superRod: false })
  assert.deepEqual(encounterMethods(disabled[0].details).map(tag => tag.method), ['gift'])
  const enabled = accessibleEncounters(rows, { surf: true, superRod: true })
  assert.equal(encounterMethods(enabled[0].details).length, 5)
  assert.notEqual(methodLabel(t, 'surf'), methodLabel(t, 'surf-spots'))
  assert.notEqual(methodLabel(t, 'super-rod'), methodLabel(t, 'super-rod-spots'))
})

test('special encounters have readable labels and unknown methods stay visible', () => {
  for (const method of ['cave-spots', 'bridge-spots', 'gift', 'gift-egg', 'static', 'npc-trade']) {
    assert.ok(isKnownEncounterMethod(method))
    assert.notEqual(methodLabel(t, method), method)
    assert.ok(encounterMethodIcon(method))
  }
  assert.equal(methodLabel(t, 'new-method'), 'new method')
  assert.equal(encounterMethodIcon('constructor'), '🔎')
})
