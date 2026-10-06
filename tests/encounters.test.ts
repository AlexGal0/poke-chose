import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blackLocations, collectBlackEncounters, getBlackEncounters } from '../src/api/encounters.ts'
import type { EncounterAreaResponse } from '../src/api/encounters.ts'
import { captureChecklist } from '../src/domain/checklist.ts'

const encounter = (id: number, name: string, version: string, level = 10) => ({
  pokemon: { name, url: `https://pokeapi.co/api/v2/pokemon/${id}/` },
  version_details: [{ version: { name: version }, encounter_details: [{ min_level: level, max_level: level + 2, chance: 20, method: { name: 'walk' }, condition_values: [{ name: 'season-spring' }] }] }],
})
test('exact Black filter excludes White-exclusive and Black 2 data, including details for shared species', () => {
  const shared = encounter(574, 'gothita', 'black')
  shared.version_details.push(...encounter(574, 'gothita', 'black-2', 50).version_details)
  const areas: EncounterAreaResponse[] = [{ name: 'area', pokemon_encounters: [shared, encounter(577, 'solosis', 'white'), encounter(572, 'minccino', 'black')] }]
  const result = collectBlackEncounters(areas)
  assert.deepEqual(result.map(row => row.speciesId), [572, 574])
  assert.equal(result.find(row => row.speciesId === 574)!.details.length, 1)
  assert.equal(result.find(row => row.speciesId === 574)!.details[0].minLevel, 10)
})
test('subareas deduplicate species for checklist totals and retain their encounter tables', () => {
  const result = collectBlackEncounters([{ name: 'area-1', pokemon_encounters: [encounter(519, 'pidove', 'black')] }, { name: 'area-2', pokemon_encounters: [encounter(519, 'pidove', 'black'), encounter(522, 'blitzle', 'black')] }])
  assert.equal(result[0].details.length, 2)
  const checklist = captureChecklist(result, new Set([519]))
  assert.equal(checklist.total, 2)
  assert.equal(checklist.caught, 1)
})
test('BW zone catalogue excludes White Forest and B2W2-only locations', () => {
  const resources = [358, 393, 425, 538].map(id => ({ name: `location-${id}`, url: `https://pokeapi.co/api/v2/location/${id}/` }))
  assert.deepEqual(blackLocations(resources).map(row => row.id), [358])
})
test('variety encounter IDs normalize to National species IDs before consulting caught flags', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async input => {
    const url = String(input)
    const body = url.includes('/location-area/') ? { name: 'test', pokemon_encounters: [encounter(10016, 'basculin-blue-striped', 'black'), encounter(550, 'basculin-red-striped', 'black')] } : url.includes('/pokemon/') ? { species: { name: 'basculin', url: 'https://pokeapi.co/api/v2/pokemon-species/550/' } } : { areas: [{ name: 'test', url: 'https://pokeapi.co/api/v2/location-area/1/' }] }
    return new Response(JSON.stringify(body))
  }
  try {
    const rows = await getBlackEncounters(358)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].speciesId, 550)
    assert.equal(rows[0].details.length, 2)
    assert.equal(captureChecklist(rows, new Set([550])).caught, 1)
  } finally { globalThis.fetch = original }
})
