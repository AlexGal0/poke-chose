// Refresh navigation metadata independently from random encounters.
import { writeFile } from 'node:fs/promises'
import { adaptSpecies } from '../src/games/core/catalog.ts'
import { xCatalogRules } from '../src/games/x/catalog.ts'

async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  return response.json()
}
const base = 'https://pokeapi.co/api/v2/'
const region = await get(`${base}region/kalos`)
const locations = []
for (const resource of region.locations) {
  const location = await get(resource.url)
  locations.push({ id: location.id, name: location.name, names: Object.fromEntries(location.names.filter(row => ['es', 'en'].includes(row.language.name)).map(row => [row.language.name, row.name])), areas: [] })
}
await writeFile('src/games/x/data/locations.json', `${JSON.stringify(locations, null, 2)}\n`)
const species = []
for (const id of [208, 625]) {
  const pokemon = await get(`${base}pokemon/${id}`)
  const info = await get(pokemon.species.url)
  species.push({ ...adaptSpecies(pokemon, { id, name: info.name }, xCatalogRules), genderRate: info.gender_rate })
}
await writeFile('src/games/x/data/special-species.json', `${JSON.stringify(species, null, 2)}\n`)
