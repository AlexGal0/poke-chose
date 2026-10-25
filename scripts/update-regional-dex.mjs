// Public regional Pokédex membership, independent of the player's discoveries.
import { writeFile } from 'node:fs/promises'

async function csv(name) {
  const response = await fetch(`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`)
  if (!response.ok) throw new Error(`${name}: ${response.status}`)
  const [header, ...lines] = (await response.text()).trim().split(/\r?\n/).map(line => line.split(','))
  return lines.map(row => Object.fromEntries(header.map((key, index) => [key, row[index]])))
}
const [dexes, numbers] = await Promise.all([csv('pokedexes'), csv('pokemon_dex_numbers')])
const names = ['kalos-central', 'kalos-coastal', 'kalos-mountain']
const ids = dexes.filter(row => names.includes(row.identifier)).map(row => row.id)
if (ids.length !== 3) throw new Error('Missing Kalos regional Pokédex')
const species = [...new Set(numbers.filter(row => ids.includes(row.pokedex_id)).map(row => Number(row.species_id)))].sort((a, b) => a - b)
if (!species.includes(25) || !species.includes(650) || species.some(id => id > 721)) throw new Error('Invalid Kalos regional Pokédex')
await writeFile('src/games/x/data/regional-dex.json', `${JSON.stringify(species)}\n`)
console.log(`Stored ${species.length} Kalos regional species`)
