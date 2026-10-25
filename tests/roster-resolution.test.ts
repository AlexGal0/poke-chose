import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visibleRosterResolution, resolveSavedRoster } from '../src/games/core/saved-roster.ts'
import { xSavedRosterService } from '../src/games/x/saved-roster.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'
import { readPartyPk6, readPk6 } from '../src/games/x/pk6.ts'
import { levelFromExperience } from '../src/domain/experience.ts'

test('pending reads preserve a resolved roster only for the same source and resolver', async () => {
  const roster = await resolveSavedRoster(xSavedRosterService, [readPartyPk6(fixturePk6({ party: true }), 0)], [])
  const result = { key: 'old-reading', sourceKey: 'live', service: xSavedRosterService, ...roster, error: false }
  assert.equal(visibleRosterResolution(result, 'next-reading', 'live', xSavedRosterService), result)
  assert.equal(visibleRosterResolution(result, 'old-reading', 'live', xSavedRosterService), result)
  assert.equal(visibleRosterResolution(result, 'next-reading', 'save', xSavedRosterService), null)
  assert.equal(visibleRosterResolution(result, null, 'live', xSavedRosterService), null)
  assert.equal(visibleRosterResolution(result, 'next-reading', 'live', { ...xSavedRosterService }), null)
  assert.equal(visibleRosterResolution(null, 'next-reading', 'live', xSavedRosterService), null)
})

test('X box levels use each species growth table while party levels keep the source reading', async () => {
  const member = readPartyPk6(fixturePk6({ party: true, level: 20 }), 0)
  const boxes = [1, 25, 653].map((speciesId, slot) => ({ ...readPk6(fixturePk6({ speciesId }))!, box: 0, slot, experience: 1000 }))
  const roster = await resolveSavedRoster(xSavedRosterService, [member], boxes)
  assert.equal(roster.party[0].level, 20)
  for (const pokemon of roster.collection.filter(p => p.location === 'box')) {
    assert.equal(pokemon.level, levelFromExperience(1000, pokemon.experienceLevels!))
    assert.ok(pokemon.level !== null)
  }
  assert.equal(roster.collection[1].level, 12) // Bulbasaur: medium slow.
  assert.equal(roster.collection[2].level, 10) // Pikachu: medium fast.
})

test('box levels stay unavailable for eggs, absent experience or absent/invalid growth data', async () => {
  const box = { ...readPk6(fixturePk6())!, box: 0, slot: 0 }
  const rows = [
    { ...box, isEgg: true, experience: 1000 },
    { ...box, slot: 1, experience: undefined },
    { ...box, slot: 2, experience: -1 },
  ]
  assert.ok((await resolveSavedRoster(xSavedRosterService, [], rows)).collection.every(p => p.level === null))
  const withoutGrowth = { ...xSavedRosterService, resolve: async () => ({ id: 653, name: 'fennekin', types: ['fire'], sprite: null }) }
  assert.equal((await resolveSavedRoster(withoutGrowth, [], [{ ...box, experience: 1000 }])).collection[0].level, null)
  const invalidGrowth = { ...withoutGrowth, resolve: async () => ({ ...await withoutGrowth.resolve(), experienceLevels: [] }) }
  assert.equal((await resolveSavedRoster(invalidGrowth, [], [{ ...box, experience: 1000 }])).collection[0].level, null)
})
