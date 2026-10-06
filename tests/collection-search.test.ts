import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesCollectionTags } from '../src/domain/collection-search.ts'
import type { Pokemon } from '../src/models/pokemon.ts'

const pokemon: Pokemon = { id: 1, name: 'bulbasaur', sprite: null, types: ['grass', 'poison'] }

test('collection tags combine partial names, exact IDs and both types with AND', () => {
  assert.equal(matchesCollectionTags(pokemon, ''), true)
  assert.equal(matchesCollectionTags(pokemon, ' BULBA, #1 planta veneno '), true)
  assert.equal(matchesCollectionTags(pokemon, 'grass poison'), true)
  assert.equal(matchesCollectionTags(pokemon, 'planta fuego'), false)
  assert.equal(matchesCollectionTags(pokemon, '10'), false)
  assert.equal(matchesCollectionTags(pokemon, 'pla'), false)
  assert.equal(matchesCollectionTags(pokemon, '#'), false)
})

test('collection type tags ignore case and accents, using exact Spanish or English type names', () => {
  const electric: Pokemon = { id: 25, name: 'pikachu', sprite: null, types: ['electric'] }
  assert.equal(matchesCollectionTags(electric, 'ELÉCTRICO'), true)
  assert.equal(matchesCollectionTags(electric, '#electrico, electric pika'), true)
  assert.equal(matchesCollectionTags(electric, 'elect'), false)
  assert.equal(matchesCollectionTags(electric, 'agua'), false)
})
