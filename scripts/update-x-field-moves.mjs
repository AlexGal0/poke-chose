// Fixed public XY learnsets, never player-derived resources.
import { readFile, writeFile } from 'node:fs/promises'
const catalog = JSON.parse(await readFile('src/games/x/data/roster.json', 'utf8')).catalog
const moves = { 15: 'cut', 19: 'fly', 57: 'surf', 70: 'strength', 127: 'waterfall', 148: 'flash', 91: 'dig', 249: 'rock-smash' }
const byId = new Map(catalog.map(row => [String(row.pokemonId), row.resourceName]))
const compatibility = Object.fromEntries(catalog.map(row => [row.resourceName, []]))
const response = await fetch('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_moves.csv', { signal: AbortSignal.timeout(60000) })
if (!response.ok) throw new Error(`Learnsets: ${response.status}`)
for (const line of (await response.text()).split(/\r?\n/).slice(1)) {
  const [pokemon, version, move, method] = line.split(',')
  const name = byId.get(pokemon)
  if (name && version === '15' && method === '4' && moves[move] && !compatibility[name].includes(moves[move])) compatibility[name].push(moves[move])
}
if (!compatibility.pikachu.includes('flash') || !compatibility.lapras.includes('surf')) throw new Error('Invalid XY compatibility')
await writeFile('src/games/x/data/field-moves.json', `${JSON.stringify(compatibility)}\n`)
console.log(`Stored XY field compatibility for ${Object.keys(compatibility).length} varieties`)
