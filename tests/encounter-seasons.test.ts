import test from 'node:test'
import assert from 'node:assert/strict'
import { encounterSeasons } from '../src/domain/encounter-seasons.ts'
import { encounterChances } from '../src/domain/encounter-chances.ts'
import type { BlackEncounterDetail } from '../src/models/encounters.ts'
import i18n from '../src/i18n/index.ts'
import { encounterConditionLabel } from '../src/i18n/encounter-seasons.ts'

const t = i18n.getFixedT('es')

test('each recorded season has a distinct icon and Spanish label', () => {
  const conditions = ['season-spring', 'season-summer', 'season-autumn', 'season-winter']
  const seasons = encounterSeasons(conditions)
  assert.deepEqual(seasons.map(season => encounterConditionLabel(t, season.condition)), ['Primavera', 'Verano', 'Otoño', 'Invierno'])
  assert.equal(new Set(seasons.map(season => season.icon)).size, 4)
  assert.deepEqual(conditions.map(condition => encounterConditionLabel(t, condition)), seasons.map(season => encounterConditionLabel(t, season.condition)))
})

test('unrelated or unknown conditions do not invent a season; duplicate seasons are displayed once', () => {
  assert.deepEqual(encounterSeasons(['time-night', 'season-unknown', 'constructor']), [])
  assert.equal(encounterConditionLabel(t, 'time-night'), 'time-night')
  assert.equal(encounterConditionLabel(t, 'constructor'), 'constructor')
  assert.equal(encounterSeasons(['season-winter', 'season-winter', 'time-night']).length, 1)
})

test('seasonal slot totals keep each rate paired with its own season and encounter method', () => {
  const detail = (chance: number, season: string, method = 'walk'): BlackEncounterDetail => ({ area: 'route-6', method, minLevel: 20, maxLevel: 25, chance, conditions: [season] })
  const groups = encounterChances([detail(10, 'season-spring'), detail(20, 'season-spring'), detail(5, 'season-winter'), detail(40, 'season-winter', 'dark-grass')])
  assert.deepEqual(groups.map(group => [group.method, group.chance, encounterConditionLabel(t, encounterSeasons(group.conditions)[0].condition)]), [
    ['dark-grass', 40, 'Invierno'], ['walk', 30, 'Primavera'], ['walk', 5, 'Invierno'],
  ])
})
