// Fixed public metadata; never uses a save, memory reading or user-derived query.
import { writeFile } from 'node:fs/promises'

const source = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv'
const response = await fetch(source, { signal: AbortSignal.timeout(30000) })
if (!response.ok) throw new Error(`Species metadata: ${response.status}`)
const [header, ...rows] = (await response.text()).trim().split(/\r?\n/).map(line => line.split(','))
const idColumn = header.indexOf('id'), cyclesColumn = header.indexOf('hatch_counter')
if (idColumn < 0 || cyclesColumn < 0) throw new Error('Missing hatch cycle columns')
const cycles = Object.fromEntries(rows.filter(row => Number(row[idColumn]) >= 1 && Number(row[idColumn]) <= 721).map(row => [row[idColumn], Number(row[cyclesColumn])]))
if (Object.keys(cycles).length !== 721 || Object.values(cycles).some(value => !Number.isInteger(value) || value < 1 || value > 255)) throw new Error('Incomplete X hatch cycles')
await writeFile('src/games/x/data/hatch-cycles.json', JSON.stringify({ source, cycles }) + '\n')
console.log('Updated public X hatch cycles: 721 species')
