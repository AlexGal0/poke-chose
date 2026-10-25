import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mergeEncounterSpecies, filterEncounterRows, betterEncounterZones, uniqueEncounterZone, ownedKnowledgeAncestors } from '../src/games/core/encounters.ts'
import type { EncounterAtlasData, EncounterZone } from '../src/games/core/encounters.ts'
import type { EncounterDetail } from '../src/models/encounters.ts'
import { isManualPokemon } from '../src/games/core/catalog.ts'
import { xCatalogRules } from '../src/games/x/catalog.ts'
import { encounterChances } from '../src/domain/encounter-chances.ts'
import { isKnownEncounterMethod } from '../src/domain/encounter-methods.ts'
import { encounterAreaLabel, encounterResourceLabel, atlasConditionLabel } from '../src/i18n/encounter-atlas.ts'
import i18n from '../src/i18n/index.ts'

const data = JSON.parse(readFileSync(new URL('../src/games/x/data/encounters.json', import.meta.url), 'utf8')) as EncounterAtlasData
const detail = (chance: number, method = 'walk', conditions: string[] = []): EncounterDetail => ({ area: 'area', method, chance, conditions, minLevel: 3, maxLevel: 5 })
const zone = (id: number, details: EncounterDetail[]): EncounterZone => ({ id, name: `zone-${id}`, names: { en: `Zone ${id}` }, areas: [{ name: 'area', names: {}, rows: [{ speciesId: 13, name: 'weedle', variety: 'weedle', details }] }] })

test('X snapshot contains version exclusives, National species IDs, valid cards and encounter tables', () => {
  assert.equal(data.version, 'x')
  assert.equal(data.locations.length, 46)
  assert.equal(new Set(data.locations.map(zone => zone.id)).size, data.locations.length)
  assert.equal(new Set(data.species.map(species => species.id)).size, data.species.length)
  for (const species of data.species) {
    assert.ok(isManualPokemon(species, xCatalogRules), species.name)
    assert.ok(Number.isInteger(species.genderRate) && species.genderRate >= -1 && species.genderRate <= 8)
  }
  for (const zone of data.locations) for (const area of zone.areas) for (const row of area.rows) {
    assert.ok(data.species.some(species => species.id === row.speciesId && species.name === row.name))
    for (const detail of row.details) {
      assert.equal(detail.area, area.name)
      assert.ok(isKnownEncounterMethod(detail.method), detail.method)
      assert.ok(detail.chance !== null && detail.chance >= 0 && detail.chance <= 100)
      assert.ok(detail.minLevel >= 1 && detail.maxLevel <= 100 && detail.minLevel <= detail.maxLevel)
    }
  }
  const route2 = data.locations.find(zone => zone.id === 591)!.areas[0].rows
  assert.ok(route2.some(row => row.name === 'weedle'))
  assert.ok(!route2.some(row => row.name === 'caterpie'))
  const legends = data.locations.flatMap(zone => zone.areas.flatMap(area => area.rows))
  assert.ok(legends.some(row => row.name === 'xerneas'))
  assert.ok(!legends.some(row => row.name === 'yveltal'))
})

test('species merging preserves varieties in source details; filters never mutate the source', () => {
  const source = [
    { speciesId: 550, name: 'basculin', details: [detail(40, 'surf')] },
    { speciesId: 550, name: 'basculin', details: [detail(20, 'old-rod')] },
    { speciesId: 13, name: 'weedle', details: [detail(11)] },
  ]
  const before = structuredClone(source)
  const merged = mergeEncounterSpecies(source)
  assert.equal(merged.length, 2)
  assert.equal(merged[0].details.length, 2)
  assert.deepEqual(filterEncounterRows(merged, new Set(['old-rod']), '550')[0].details.map(value => value.method), ['old-rod'])
  assert.deepEqual(filterEncounterRows(merged, new Set(['walk']), ' weedle ').map(row => row.speciesId), [13])
  assert.deepEqual(filterEncounterRows(merged, new Set(), ''), [])
  assert.deepEqual(source, before)
})

test('chance comparison sums slots but compares only the same method and conditions', () => {
  const current = [detail(10), detail(5), detail(20, 'horde')]
  const alternatives = betterEncounterZones(13, 1, current, [zone(1, current), zone(2, [detail(14)]), zone(3, [detail(10), detail(15)]), zone(4, [detail(100, 'surf')]), zone(5, [detail(100, 'walk', ['story-progress-hall-of-fame'])])])
  assert.deepEqual(alternatives.map(value => [value.zone.id, value.chance]), [[3, 25]])
  const route2 = data.locations.find(zone => zone.id === 591)!.areas[0].rows.find(row => row.name === 'weedle')!
  assert.equal(encounterChances(route2.details)[0].chance, 11)
  const horde = data.locations.find(zone => zone.id === 602)!.areas[0].rows.flatMap(row => row.details)
  assert.ok(horde.some(value => value.method === 'horde'))
})

test('all snapshot methods, conditions and labels resolve in both locales; unknown cave floors remain explicit', () => {
  for (const locale of ['es', 'en']) {
    const t = i18n.getFixedT(locale)
    for (const zone of data.locations) {
      assert.ok(encounterResourceLabel(zone, locale))
      for (const area of zone.areas) {
        const label = encounterAreaLabel(t, area, zone, locale)
        assert.ok(label && !label.includes('encounterAtlas.'))
        if (area.name.includes('unknown-area-')) assert.match(label, locale === 'es' ? /sin verificar/ : /unverified/)
        for (const row of area.rows) for (const detail of row.details) {
          assert.ok(i18n.exists(`encounterMethods.list.${detail.method}.label`, { lng: locale }))
          assert.ok(i18n.exists(`encounterMethods.list.${detail.method}.description`, { lng: locale }))
          for (const condition of detail.conditions) {
            assert.ok(i18n.exists(`encounterAtlas.conditions.${condition}`, { lng: locale }), condition)
            assert.ok(!atlasConditionLabel(t, condition).includes('encounterAtlas.'))
          }
        }
      }
    }
  }
  assert.equal(encounterResourceLabel({ name: 'technical', names: { en: 'English fallback' } }, 'es'), 'English fallback')
})

test('unique encounters count zones once and ignore gifts, trades, static or unknown methods', () => {
  const current = zone(1, [detail(20, 'horde'), detail(10, 'yellow-flowers')])
  assert.equal(uniqueEncounterZone(13, 1, [current, zone(2, [detail(100, 'gift')])]), true)
  assert.equal(uniqueEncounterZone(13, 1, [current, zone(2, [detail(10, 'walk')])]), false)
  for (const method of ['gift', 'gift-egg', 'npc-trade', 'static', 'unknown']) assert.equal(uniqueEncounterZone(13, 1, [zone(1, [detail(100, method)])]), false)
  assert.equal(uniqueEncounterZone(13, 2, [current]), false)
})
test('owned evolution hints use strict ancestors, never siblings, descendants or the species itself', () => {
  const node = (id: number, children: ReturnType<typeof leaf>[] = []) => ({ id, name: String(id), methods: [], children })
  const leaf = (id: number) => ({ id, name: String(id), methods: [], children: [] })
  const root = node(280, [node(281, [leaf(282), leaf(475)])])
  assert.deepEqual(ownedKnowledgeAncestors(root, 282, new Set([280, 281, 475])).map(p => p.id), [280, 281])
  assert.deepEqual(ownedKnowledgeAncestors(root, 282, new Set([282, 475])), [])
  assert.deepEqual(ownedKnowledgeAncestors(root, 280, new Set([281])), [])
  assert.deepEqual(ownedKnowledgeAncestors(root, 999, new Set([280])), [])
})
test('better chances compare condition sets without mixing encounter methods', () => {
  const result = betterEncounterZones(13, 1, [detail(10, 'horde', ['a', 'b'])], [zone(2, [detail(20, 'horde', ['b', 'a'])]), zone(3, [detail(90, 'walk', ['a', 'b'])])])
  assert.deepEqual(result.map(row => row.zone.id), [2])
})
