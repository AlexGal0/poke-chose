import { test } from 'node:test'
import assert from 'node:assert/strict'
import { xEncounters, xRouteOrder } from '../src/games/x/encounters.ts'
import { encounterChances } from '../src/domain/encounter-chances.ts'
import { filterCaptureProgress, filterEncounterRows, mergeEncounterSpecies } from '../src/games/core/encounters.ts'
import { isManualPokemon } from '../src/games/core/catalog.ts'
import { xCatalogRules } from '../src/games/x/catalog.ts'
import { readFileSync } from 'node:fs'

test('X itinerary includes towns without encounters and preserves early story order', () => {
  assert.deepEqual(xRouteOrder.slice(0, 8), [587, 588, 590, 591, 593, 594, 596, 655])
  assert.equal(new Set(xEncounters.locations.map(zone => zone.id)).size, xEncounters.locations.length)
  for (const name of ['santalune-city', 'camphrier-town', 'geosenge-town', 'coumarine-city', 'dendemille-town', 'anistar-city', 'snowbelle-city', 'kiloude-city']) assert.ok(xEncounters.locations.some(zone => zone.name === name), name)
  assert.equal(xEncounters.locations.find(zone => zone.id === 604)!.areas.length, 0)
})

test('NPC trades use national species, requirements and no random probability', () => {
  const zone = xEncounters.locations.find(zone => zone.id === 596)!
  const rows = mergeEncounterSpecies(zone.areas.flatMap(area => area.rows))
  assert.equal(rows[0].speciesId, 83)
  assert.equal(rows[0].details[0].trade?.requested, 'bunnelby')
  assert.deepEqual(encounterChances(rows[0].details), [])
  assert.equal(filterEncounterRows(rows, new Set(['walk']), '').length, 0)
  assert.equal(filterEncounterRows(rows, new Set(['npc-trade']), '83').length, 1)
  const dex = { seenSpeciesIds: new Set([83]), caughtSpeciesIds: new Set<number>() }
  assert.equal(filterCaptureProgress(rows, dex, 'caught').length, 0)
  assert.equal(filterCaptureProgress(rows, dex, 'seen').length, 1)
  for (const zone of xEncounters.locations) for (const area of zone.areas) for (const row of area.rows) {
    assert.ok(isManualPokemon(xEncounters.species.find(species => species.id === row.speciesId), xCatalogRules))
    for (const detail of row.details) if (detail.method === 'gift' || detail.method === 'npc-trade') {
      assert.equal(detail.chance, null)
      const key = detail.trade?.instructionsKey ?? detail.instructionsKey
      assert.ok(key)
      for (const locale of ['es', 'en']) {
        const translations = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${locale}/translation.json`, import.meta.url), 'utf8'))
        assert.equal(typeof key.split('.').reduce((value, part) => value?.[part], translations), 'string', key)
      }
    }
  }
})

test('X itinerary sections preserve every locality and provide localized ranges', () => {
  const sections = xEncounters.locations.map(zone => zone.stage?.name)
  assert.ok(sections.every(Boolean))
  assert.equal(new Set(sections).size, 8)
  for (const name of new Set(sections)) {
    const indices = sections.flatMap((value, index) => value === name ? [index] : [])
    assert.equal(indices.at(-1)! - indices[0] + 1, indices.length)
  }
  for (const zone of xEncounters.locations) {
    assert.ok(zone.stage?.names.es)
    assert.ok(zone.stage?.names.en)
  }
})
