// Public, version-filtered data only. No ROM, save or emulator access.
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const base = 'https://pokeapi.co/api/v2/'
const cache = '.cache/y-pokeapi'
await mkdir(cache, { recursive: true })
const requests = new Map()
function get(path) {
  if (!requests.has(path)) requests.set(path, (async () => {
    const file = `${cache}/${path.replaceAll('/', '-')}.json`
    try { return JSON.parse(await readFile(file, 'utf8')) } catch { /* First download. */ }
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`${path}: ${response.status}`)
    const data = await response.json()
    await writeFile(file, JSON.stringify(data))
    return data
  })())
  return requests.get(path)
}
const id = resource => Number(new URL(resource.url).pathname.split('/').filter(Boolean).at(-1))
const names = data => Object.fromEntries(data.names.filter(row => ['es', 'en'].includes(row.language.name)).map(row => [row.language.name, row.name]))
const roster = JSON.parse(await readFile('src/games/x/data/roster.json', 'utf8'))
const known = JSON.parse(await readFile('src/games/x/data/encounters.json', 'utf8'))
const species = new Map()
const region = await get('region/kalos')
const version = await get('version/y')
if (version.name !== 'y' || version.version_group.name !== 'x-y') throw new Error('Unexpected version')
let cursor = 0
const locations = new Array(region.locations.length)
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < region.locations.length) {
    const index = cursor++
    const location = await get(`location/${id(region.locations[index])}`)
    const areas = []
    for (const resource of location.areas) {
      const area = await get(`location-area/${id(resource)}`)
      const rows = []
      for (const entry of area.pokemon_encounters) {
        const details = entry.version_details.filter(row => row.version.name === 'y').flatMap(row => row.encounter_details)
        if (!details.length) continue
        const variety = roster.catalog.find(row => row.resourceName === entry.pokemon.name)
        if (!variety) throw new Error(`Missing XY public variety: ${entry.pokemon.name}`)
        const speciesId = variety.id
        if (!species.has(speciesId)) {
          const row = roster.catalog.find(row => row.id === speciesId && row.isDefault)
          const previous = known.species.find(row => row.id === speciesId)
          const genderRate = previous?.genderRate ?? (await get(`pokemon-species/${speciesId}`)).gender_rate
          species.set(speciesId, { id: row.id, name: row.name, types: row.types, sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vi/x-y/${row.pokemonId}.png`, genderRate })
        }
        rows.push({ speciesId, name: variety.name, variety: entry.pokemon.name, details: details.map(detail => ({ area: area.name, method: detail.method.name, minLevel: detail.min_level, maxLevel: detail.max_level, chance: detail.chance, conditions: detail.condition_values.map(row => row.name), ...(detail.pokemon_details ? { pokemonDetails: detail.pokemon_details } : {}) })) })
      }
      if (rows.length) areas.push({ name: area.name, names: names(area), rows })
    }
    locations[index] = { id: location.id, name: location.name, names: names(location), areas }
  }
}))
const snapshot = { version: 'y', source: base, retrieved: new Date().toISOString(), species: [...species.values()].sort((a, b) => a.id - b.id), locations: locations.filter(zone => zone.areas.length) }
await mkdir('src/games/y/data', { recursive: true })
await writeFile('src/games/y/data/encounters.json', `${JSON.stringify(snapshot, null, 2)}\n`)
console.log(`Y: ${snapshot.locations.length} locations, ${snapshot.species.length} species; ${requests.size} public resources (cached)`)
