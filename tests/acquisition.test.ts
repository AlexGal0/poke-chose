import { test } from 'node:test'
import assert from 'node:assert/strict'
import { acquisitionTags } from '../src/domain/acquisition.ts'
import type { PokemonEncounter } from '../src/domain/acquisition.ts'
import type { EvolutionNode } from '../src/models/evolution.ts'
import { getAcquisitionTags } from '../src/api/acquisition.ts'

const encounter = (version: string, ...methods: string[]): PokemonEncounter => ({ version_details: [{ version: { name: version }, encounter_details: methods.map(name => ({ method: { name } })) }] })
const node = (id: number, trigger: string): EvolutionNode => ({ speciesId: id, name: 'test', children: [], methods: [{ trigger: { name: trigger, url: 'https://pokeapi.co/api/v2/evolution-trigger/1/' } }] })
const kinds = (tags: ReturnType<typeof acquisitionTags>) => tags.map(tag => tag.kind)

test('capture and evolution coexist; White and Black 2 encounters do not imply Black capture', () => {
  assert.deepEqual(kinds(acquisitionTags(573, [encounter('black', 'grass-spots', 'grass-spots'), encounter('white', 'surf')], node(573, 'use-item'))), ['capture', 'evolution'])
  assert.deepEqual(kinds(acquisitionTags(497, [encounter('white', 'walk'), encounter('black-2', 'gift')], node(497, 'level-up'))), ['evolution', 'unknown'])
})
test('trade evolution, NPC trade and acquisition from other games stay distinct', () => {
  assert.deepEqual(kinds(acquisitionTags(534, [], node(534, 'trade'))), ['trade-evolution', 'unknown'])
  assert.deepEqual(kinds(acquisitionTags(548, [encounter('black', 'npc-trade')], undefined)), ['npc-trade'])
  assert.deepEqual(kinds(acquisitionTags(577, [], undefined, true)), ['breed', 'external'])
})
test('gifts, eggs, fossils and fixed encounters keep their own tags', () => {
  assert.deepEqual(kinds(acquisitionTags(636, [encounter('black', 'gift-egg')], undefined, true)), ['egg', 'breed'])
  assert.deepEqual(kinds(acquisitionTags(564, [encounter('black', 'gift')], undefined)), ['fossil'])
  assert.deepEqual(kinds(acquisitionTags(637, [encounter('black', 'static')], node(637, 'level-up'))), ['static', 'evolution'])
  assert.deepEqual(kinds(acquisitionTags(495, [encounter('black', 'gift')], undefined)), ['gift'])
})
test('missing or unfamiliar data stays uncertain rather than becoming an external-only claim', () => {
  assert.deepEqual(kinds(acquisitionTags(1, [], undefined)), ['unknown'])
  assert.deepEqual(kinds(acquisitionTags(1, [encounter('black', 'unrecognized')], undefined)), ['unknown'])
  assert.ok(kinds(acquisitionTags(647, [], undefined)).includes('event'))
})
test('API uses default variety and lightweight family without requesting sibling sprites', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = async input => {
    const url = String(input)
    calls.push(url)
    const body = url.includes('/pokemon-species/') ? { evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/1/' }, varieties: [{ is_default: true, pokemon: { name: 'default-form', url: 'https://pokeapi.co/api/v2/pokemon/10001/' } }], egg_groups: [{ name: 'monster' }] }
      : url.includes('/evolution-chain/') ? { chain: { species: { name: 'test', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' }, evolution_details: [], evolves_to: [] } }
      : [encounter('black', 'walk'), encounter('white', 'gift')]
    return new Response(JSON.stringify(body))
  }
  try {
    assert.deepEqual(kinds(await getAcquisitionTags(1)), ['capture', 'breed'])
    assert.equal(calls.length, 3)
    assert.ok(calls.some(url => url.endsWith('/pokemon/10001/encounters')))
    assert.equal(calls.some(url => /\/pokemon\/\d+$/.test(url)), false)
  } finally { globalThis.fetch = original }
})
test('API failures propagate to the independent icon retry', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response('', { status: 503 })
  try { await assert.rejects(getAcquisitionTags(495), /PokéAPI/) } finally { globalThis.fetch = original }
})
