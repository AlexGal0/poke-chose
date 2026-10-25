import test from 'node:test'
import assert from 'node:assert/strict'
import { getEvolutionItem } from '../src/api/evolution-items.ts'

test('evolution item lookup uses Gen V game indexes rather than API IDs and falls back to English names', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ name: 'fire-stone', names: [{ name: 'Fire Stone', language: { name: 'en' } }], game_indices: [
    { game_index: 999, generation: { name: 'generation-iv' } },
    { game_index: 82, generation: { name: 'generation-v' } },
  ] }))
  try {
    assert.deepEqual(await getEvolutionItem('fire-stone', 'es'), { name: 'Fire Stone', gameIndex: 82 })
    globalThis.fetch = async () => new Response(JSON.stringify({ name: 'unknown-stone', names: [], game_indices: [] }))
    assert.deepEqual(await getEvolutionItem('unknown-stone', 'es'), { name: 'unknown-stone', gameIndex: null })
  } finally { globalThis.fetch = original }
})
