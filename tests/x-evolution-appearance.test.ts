import { test } from 'node:test'
import assert from 'node:assert/strict'
import { xEvolutionAppearance } from '../src/games/x/knowledge.ts'

test('X evolution appearance supplies only the requested family with local sprites and Gen VI types', async () => {
  const family = { id: 280, name: 'ralts', methods: [], children: [{ id: 281, name: 'kirlia', methods: [], children: [{ id: 282, name: 'gardevoir', methods: [], children: [] }, { id: 475, name: 'gallade', methods: [], children: [] }] }] }
  const appearance = await xEvolutionAppearance(family)
  assert.deepEqual(Object.keys(appearance), ['280', '281', '282', '475'])
  assert.deepEqual(appearance[282].types, ['psychic', 'fairy'])
  assert.deepEqual(appearance[475].types, ['psychic', 'fighting'])
  for (const pokemon of Object.values(appearance)) assert.ok(pokemon.sprite?.startsWith('/pokemon-x/'))
  await assert.rejects(xEvolutionAppearance({ ...family, id: 9999 }))
})

import { xCatalog } from '../src/games/x/catalog.ts'
test('X catalog supplies all 721 species with game types for shared filtering', async () => {
  const entries = await xCatalog.list()
  assert.equal(entries.length, 721)
  assert.equal(new Set(entries.map(p => p.id)).size, 721)
  assert.deepEqual(entries.find(p => p.id === 280)?.types, ['psychic', 'fairy'])
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(xCatalog.list(controller.signal))
})
