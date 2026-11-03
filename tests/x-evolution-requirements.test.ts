import test from 'node:test'
import assert from 'node:assert/strict'
import { requirementTree, xEvolutionRequirements as service } from '../src/games/x/evolution-requirements.ts'
import { pendingEvolutions, requiredEvolutionItems } from '../src/domain/evolution-requirements.ts'
import type { KnowledgeNode } from '../src/domain/species-knowledge.ts'

const item = { name: 'whipped-dream', url: 'https://pokeapi.co/api/v2/item/646/' }
const method = { trigger: { name: 'trade', url: '' }, held_item: item, min_affection: 2, party_type: { name: 'fairy', url: 'type/18' } }
const family: KnowledgeNode = { id: 684, name: 'swirlix', methods: [], children: [{ id: 685, name: 'slurpuff', methods: [method], children: [] }] }

test('X trees preserve Gen VI species and conditions through pending item planning', () => {
  const root = requirementTree(family)
  const rows = pendingEvolutions([root, root], new Set([684]), new Set())
  assert.equal(rows.length, 1)
  assert.equal(rows[0].target.speciesId, 685)
  assert.equal(rows[0].method, method)
  assert.equal(requiredEvolutionItems(rows).get('whipped-dream'), 1)
  assert.equal(pendingEvolutions([root], new Set([684]), new Set([685])).length, 0)
  const facts = service.methodFacts(method, 685, { [item.url]: 'Dulce de Nata' })
  assert.ok(facts.some(fact => fact.key === 'speciesKnowledge.conditions.heldItem' && fact.params?.name === 'Dulce de Nata'))
  assert.ok(facts.some(fact => fact.key === 'speciesKnowledge.conditions.affection'))
  assert.ok(facts.some(fact => fact.key === 'speciesKnowledge.conditions.partyType'))
})

test('X filters use regional membership, including earlier generations, and reject later species', () => {
  assert.equal(service.inScope(25, 'regional'), true)
  assert.equal(service.inScope(684, 'regional'), true)
  assert.equal(service.inScope(152, 'regional'), false)
  assert.equal(service.inScope(152, 'national'), true)
  assert.equal(service.inScope(684, 'national'), false)
  assert.equal(service.inScope(722, 'all'), false)
})

test('X item lookup localizes and uses only an explicit Gen VI inventory index', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ name: 'whipped-dream', names: [{ name: 'Dulce de Nata', language: { name: 'es' } }, { name: 'Whipped Dream', language: { name: 'en' } }], game_indices: [{ game_index: 999, generation: { name: 'generation-v' } }, { game_index: 646, generation: { name: 'generation-vi' } }] }))
  try {
    assert.deepEqual(await service.item('whipped-dream', 'es'), { name: 'Dulce de Nata', inventoryKey: '646' })
    assert.deepEqual(await service.item('whipped-dream', 'en'), { name: 'Whipped Dream', inventoryKey: '646' })
  } finally { globalThis.fetch = original }
})

test('X species planning collapses cosmetic form routes while preserving distinct conditions', () => {
  const root = requirementTree({ ...family, children: [{ ...family.children[0], methods: [
    { ...method, required_pokemon_form: { name: 'swirlix-small', url: 'form/1' } },
    { ...method, required_pokemon_form: { name: 'swirlix-large', url: 'form/2' } },
    { ...method, time_of_day: 'night' },
  ] }] })
  assert.equal(root.children[0].methods.length, 2)
})

test('X missing Gen VI item index stays unknown even when an older-generation index exists', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ name: 'unknown-stone', names: [], game_indices: [{ game_index: 82, generation: { name: 'generation-v' } }] }))
  try { assert.deepEqual(await service.item('unknown-stone', 'es'), { name: 'unknown-stone' }) }
  finally { globalThis.fetch = original }
})
