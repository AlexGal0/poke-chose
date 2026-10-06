import test from 'node:test'
import assert from 'node:assert/strict'
import { pokemonDisplayName, pokemonSpeciesName, pokemonWikiUrl } from '../src/domain/pokemon-names.ts'
import { getCatalog, getPokemon, pokemonFromResponse } from '../src/api/pokeapi.ts'

const varieties = ['frillish-male', 'frillish-female', 'jellicent-male', 'jellicent-female', 'basculin-red-striped', 'darmanitan-standard', 'deoxys-normal', 'wormadam-plant', 'giratina-altered', 'shaymin-land', 'tornadus-incarnate', 'thundurus-incarnate', 'landorus-incarnate', 'keldeo-ordinary', 'meloetta-aria']

test('display names start sentences with a capital letter without changing stored species slugs', () => {
  for (const [slug, expected] of [['pikachu', 'Pikachu'], ['cinccino', 'Cinccino'], ['porygon-z', 'Porygon-Z'], ['mr-mime', 'Mr. Mime'], ['frillish-female', 'Frillish']]) {
    assert.equal(`${pokemonDisplayName(slug)} evoluciona de otra especie.`, `${expected} evoluciona de otra especie.`)
    assert.equal(pokemonDisplayName(pokemonDisplayName(slug)), expected)
  }
})

test('variety names resolve to species titles and WikiDex pages without dropping meaningful hyphens', () => {
  for (const variety of varieties) {
    const species = variety.split('-')[0]
    const title = species.charAt(0).toUpperCase() + species.slice(1)
    assert.equal(pokemonSpeciesName(variety), species)
    assert.equal(pokemonDisplayName(variety), title)
    assert.equal(pokemonWikiUrl(variety), `https://www.wikidex.net/wiki/${title}`)
  }
  for (const [name, title] of [['nidoran-f', 'Nidoran♀'], ['nidoran-m', 'Nidoran♂'], ['mr-mime', 'Mr. Mime'], ['mime-jr', 'Mime Jr.'], ['farfetchd', "Farfetch'd"], ['ho-oh', 'Ho-Oh'], ['porygon-z', 'Porygon-Z']]) {
    assert.equal(pokemonSpeciesName(name), name)
    assert.equal(pokemonDisplayName(name), title)
    assert.equal(decodeURIComponent(new URL(pokemonWikiUrl(name)).pathname), `/wiki/${title}`)
  }
})

test('species catalogs, legacy caches and loaded cards use species names while retaining Gen V form types', async () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const originalFetch = globalThis.fetch
  const cache = new Map<string, string>()
  const requests: string[] = []
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => cache.get(key) ?? null,
    setItem: (key: string, value: string) => cache.set(key, value),
  } })
  globalThis.fetch = async input => {
    requests.push(String(input))
    return new Response(JSON.stringify({ results: Array.from({ length: 649 }, (_, index) => ({ name: index === 591 ? 'frillish' : `species-${index + 1}`, url: `https://pokeapi.co/api/v2/pokemon-species/${index + 1}/` })) }))
  }
  try {
    const catalog = await getCatalog()
    assert.equal(requests[0], 'https://pokeapi.co/api/v2/pokemon-species?limit=649')
    assert.equal(catalog[591].name, 'frillish')
    catalog[591].name = 'frillish-male'
    catalog[592].name = 'jellicent-male'
    cache.set('poke-chose:cache:catalog-v1', JSON.stringify(catalog))
    const restored = await getCatalog()
    assert.equal(restored[591].name, 'frillish')
    assert.equal(restored[592].name, 'jellicent')
    const cachedPokemon = { id: 592, name: 'frillish-male', types: ['water', 'ghost'], sprite: null }
    cache.set('poke-chose:cache:pokemon-bw-v1-592', JSON.stringify(cachedPokemon))
    assert.deepEqual(await getPokemon(592), { ...cachedPokemon, name: 'frillish' })
    assert.equal(requests.length, 1, 'legacy caches need no network refresh')
    const response = { id: 592, name: 'frillish-male', species: { name: 'frillish' }, types: [{ slot: 1, type: { name: 'water' } }, { slot: 2, type: { name: 'ghost' } }], past_types: [], sprites: { versions: { 'generation-v': { 'black-white': { front_default: null } } } } }
    assert.equal(pokemonFromResponse(response).name, 'frillish')
    const form = pokemonFromResponse({ ...response, id: 10009, name: 'rotom-wash', species: { name: 'rotom' } }, 479)
    assert.equal(form.name, 'rotom-wash')
    assert.deepEqual(form.types, ['water', 'ghost'])
  } finally {
    globalThis.fetch = originalFetch
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
