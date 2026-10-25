// Fixed public catalog download. Never reads save files or accepts save-derived IDs.
import { mkdir, writeFile } from 'node:fs/promises'

function csv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell.replace(/\r$/, '')); cell = ''
      if (c === '\n') { rows.push(row); row = [] }
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const header = rows.shift()
  return rows.filter(row => row.length === header.length).map(row => Object.fromEntries(row.map((value, i) => [header[i], value])))
}
async function get(name) {
  const response = await fetch(`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${name}: ${response.status}`)
  return csv(await response.text())
}
const [pokemon, species, types, currentTypes, pastTypes, stats, pastStats, moves, abilities, items, indices, experience] = await Promise.all([
  'pokemon', 'pokemon_species', 'types', 'pokemon_types', 'pokemon_types_past', 'pokemon_stats', 'pokemon_stats_past', 'move_names', 'ability_names', 'item_names', 'item_game_indices', 'experience',
].map(get))
const names = rows => Object.fromEntries(rows.filter(row => ['7', '9'].includes(row.local_language_id)).map(row => [`${Object.values(row)[0]}:${row.local_language_id === '7' ? 'es' : 'en'}`, row.name]))
const typeNames = Object.fromEntries(types.map(row => [row.id, row.identifier]))
const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
const catalog = pokemon.filter(row => Number(row.species_id) <= 721).map(p => {
  const historical = pastTypes.filter(row => row.pokemon_id === p.id && Number(row.generation_id) >= 6).sort((a, b) => Number(a.generation_id) - Number(b.generation_id))
  const typing = historical.length ? historical.filter(row => row.generation_id === historical[0].generation_id) : currentTypes.filter(row => row.pokemon_id === p.id)
  const baseStats = Object.fromEntries(statNames.map((name, i) => {
    const past = pastStats.filter(row => row.pokemon_id === p.id && Number(row.stat_id) === i + 1 && Number(row.generation_id) >= 6).sort((a, b) => Number(a.generation_id) - Number(b.generation_id))[0]
    const value = past ?? stats.find(row => row.pokemon_id === p.id && Number(row.stat_id) === i + 1)
    return [name, Number(value?.base_stat)]
  }))
  return { id: Number(p.species_id), name: species.find(row => row.id === p.species_id).identifier, growthRate: Number(species.find(row => row.id === p.species_id).growth_rate_id), resourceName: p.identifier,
    pokemonId: Number(p.id), isDefault: p.is_default === '1', types: typing.sort((a, b) => Number(a.slot) - Number(b.slot)).map(row => typeNames[row.type_id]), baseStats, sprite: null }
})
await mkdir('public/pokemon-x', { recursive: true })
let cursor = 0
await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < catalog.length) {
    const p = catalog[cursor++]
    const response = await fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vi/x-y/${p.pokemonId}.png`, { signal: AbortSignal.timeout(30000) })
    if (response.status === 404) continue
    if (!response.ok) throw new Error(`Sprite ${p.pokemonId}: ${response.status}`)
    await writeFile(`public/pokemon-x/${p.pokemonId}.png`, new Uint8Array(await response.arrayBuffer()))
    p.sprite = `/pokemon-x/${p.pokemonId}.png`
  }
}))
const data = { source: 'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv', generation: 6, catalog, experience: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i + 1, experience.filter(row => Number(row.growth_rate_id) === i + 1).map(row => ({ level: Number(row.level), experience: Number(row.experience) }))])), moves: names(moves), abilities: names(abilities), items: names(items), itemIndices: Object.fromEntries(indices.filter(row => row.generation_id === '6').map(row => [row.game_index, Number(row.item_id)])) }
await writeFile('src/games/x/data/roster.json', `${JSON.stringify(data)}\n`)
console.log(`Saved public catalog: ${catalog.length} varieties, ${catalog.filter(p => p.sprite).length} local sprites`)
