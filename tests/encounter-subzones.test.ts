import test from 'node:test'
import assert from 'node:assert/strict'
import { encounterSubzones } from '../src/domain/encounter-subzones.ts'
import { encounterChances } from '../src/domain/encounter-chances.ts'
import { captureChecklist } from '../src/domain/checklist.ts'
import type { EncounterSpecies } from '../src/models/encounters.ts'
import i18n from '../src/i18n/index.ts'
import { areaLabel } from '../src/i18n/zones.ts'

const t = i18n.getFixedT('es')

test('Desert Resort sections isolate Sandile percentages without duplicating the zone count', () => {
  const rows: EncounterSpecies[] = [{ speciesId: 551, name: 'sandile', details: ['desert-resort-entrance', 'desert-resort-area'].flatMap(area => [20, 10, 5, 4, 1].map(chance => ({ area, chance, method: 'walk', conditions: [], minLevel: 19, maxLevel: 22 }))) }]
  const sections = encounterSubzones(rows)
  assert.equal(sections.length, 2)
  assert.deepEqual(sections.map(section => areaLabel(t, section.area)), ['Zona Desierto · Entrada', 'Zona Desierto · Zona principal'])
  for (const section of sections) {
    assert.equal(section.rows.length, 1)
    assert.equal(section.rows[0].details.length, 5)
    assert.deepEqual(encounterChances(section.rows[0].details).map(group => group.chance), [40])
  }
  assert.equal(captureChecklist(rows, new Set([551])).total, 1)
  assert.equal(rows[0].details.length, 10)
})

test('each subzone sorts species by its own minimum level and retains methods and conditions', () => {
  const detail = (area: string, minLevel: number) => ({ area, minLevel, maxLevel: 30, chance: 20, method: 'surf', conditions: ['season-summer'] })
  const sections = encounterSubzones([
    { speciesId: 1, name: 'first', details: [detail('a', 20), detail('b', 2)] },
    { speciesId: 2, name: 'second', details: [detail('a', 5)] },
  ])
  assert.deepEqual(sections[0].rows.map(row => row.speciesId), [2, 1])
  assert.deepEqual(sections[1].rows.map(row => row.speciesId), [1])
  assert.deepEqual(sections[1].rows[0].details[0].conditions, ['season-summer'])
  assert.deepEqual(encounterSubzones([]), [])
})
