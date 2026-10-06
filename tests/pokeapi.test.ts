import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pokemonFromResponse } from '../src/api/pokeapi.ts'
import type { PokemonResponse } from '../src/api/pokeapi.ts'

const slots = (...names: string[]) => names.map((name, i) => ({ slot: i + 1, type: { name } }))
const response = (types: string[], past: { generation: string; types: string[] }[] = []): PokemonResponse => ({
  id: 39, name: 'jigglypuff', types: slots(...types),
  past_types: past.map(p => ({ generation: { name: p.generation }, types: slots(...p.types) })),
  sprites: { versions: { 'generation-v': { 'black-white': { front_default: null } } } },
})
test('pre-Fairy types use the historical generation V entry', () => {
  assert.deepEqual(pokemonFromResponse(response(['normal', 'fairy'], [{ generation: 'generation-v', types: ['normal'] }])).types, ['normal'])
})
test('Magnemite keeps Steel in Gen V, ignoring generation I history', () => {
  assert.deepEqual(pokemonFromResponse(response(['electric', 'steel'], [{ generation: 'generation-i', types: ['electric'] }])).types, ['electric', 'steel'])
})
test('earliest historical entry covering Gen V takes priority', () => {
  assert.deepEqual(pokemonFromResponse(response(['fairy'], [{ generation: 'generation-viii', types: ['normal', 'fairy'] }, { generation: 'generation-v', types: ['normal'] }])).types, ['normal'])
})
test('rejects post-Gen V species and modern-only types', () => {
  assert.throws(() => pokemonFromResponse({ ...response(['normal']), id: 700 }))
  assert.throws(() => pokemonFromResponse(response(['fairy'])))
})
