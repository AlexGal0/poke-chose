// Refresh the curated, read-only PokéAPI snapshot. Run manually from the project root.
import { mkdir, writeFile } from 'node:fs/promises'
import { adaptSpecies } from '../src/games/core/catalog.ts'
import { xCatalogRules } from '../src/games/x/catalog.ts'

const base = 'https://pokeapi.co/api/v2/'
const requests = new Map()
function get(path) {
  if (!requests.has(path)) requests.set(path, (async () => {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`${path}: ${response.status}`)
    return response.json()
  })())
  return requests.get(path)
}
const id = resource => Number(new URL(resource.url).pathname.split('/').filter(Boolean).at(-1))
const names = data => Object.fromEntries(data.names.filter(row => ['es', 'en'].includes(row.language.name)).map(row => [row.language.name, row.name]))
const region = await get('region/kalos')
const locations = new Array(region.locations.length)
const species = new Map()
let cursor = 0
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < region.locations.length) {
    const index = cursor++
    const location = await get(`location/${id(region.locations[index])}`)
    const areas = []
    for (const resource of location.areas) {
      const area = await get(`location-area/${id(resource)}`)
      const rows = []
      for (const entry of area.pokemon_encounters) {
        const details = entry.version_details.filter(version => version.version.name === 'x').flatMap(version => version.encounter_details)
        if (!details.length) continue
        const pokemon = await get(`pokemon/${id(entry.pokemon)}`)
        const speciesId = id(pokemon.species)
        if (!species.has(speciesId)) {
          const info = await get(`pokemon-species/${speciesId}`)
          const defaultName = info.varieties.find(row => row.is_default)?.pokemon.name
          if (!defaultName) throw new Error(`Missing default variety: ${speciesId}`)
          const data = pokemon.name === defaultName ? pokemon : await get(`pokemon/${defaultName}`)
          species.set(speciesId, { ...adaptSpecies(data, { id: speciesId, name: info.name }, xCatalogRules), genderRate: info.gender_rate })
        }
        rows.push({ speciesId: id(pokemon.species), name: pokemon.species.name, variety: entry.pokemon.name,
          details: details.map(detail => ({ area: area.name, method: detail.method.name, minLevel: detail.min_level,
            maxLevel: detail.max_level, chance: detail.chance, conditions: detail.condition_values.map(value => value.name),
            ...(detail.pokemon_details ? { pokemonDetails: detail.pokemon_details } : {}) })) })
      }
      if (rows.length) areas.push({ name: area.name, names: names(area), rows })
    }
    locations[index] = { id: location.id, name: location.name, names: names(location), areas }
  }
}))
const snapshot = { version: 'x', source: base, retrieved: new Date().toISOString(), species: [...species.values()].sort((a, b) => a.id - b.id), locations: locations.filter(location => location.areas.length) }
await mkdir('src/games/x/data', { recursive: true })
await writeFile('src/games/x/data/encounters.json', `${JSON.stringify(snapshot, null, 2)}\n`)
console.log(`Saved ${snapshot.locations.length} locations; ${requests.size} unique requests`)
