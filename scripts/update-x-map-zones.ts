// Public numeric map correspondences; no ROM, save or emulator reads.
import { writeFile } from 'node:fs/promises'
import { xEncounters } from '../src/games/x/encounters.ts'

const source = 'https://seatgem.com/2021/12/pokemon-x-and-y-romfs-a-folder-content-notes.html'
const response = await fetch(source, { signal: AbortSignal.timeout(30000) })
if (!response.ok) throw new Error(`Map table: ${response.status}`)
const html = await response.text()
const start = html.indexOf('zd entry,location index,location name')
if (start < 0) throw new Error('Missing map-table header')
const table = html.slice(start).replace(/<[^>]*>/g, '')
const rows = [...table.matchAll(/(?:^|\n)(\d+),(\d+),([^\n]+)/g)].map(row => ({ mapId: Number(row[1]), locationId: Number(row[2]), name: row[3].trim() }))
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const aliases: Record<string, string> = {
  'Ambrette Aquarium': 'ambrette-town', 'Ambrette Gate': 'ambrette-town',
  'Dendemille Gate': 'dendemille-town', 'Couriway Gate': 'couriway-town',
  'Lumiose Gate': 'lumiose-city', 'Lumiose Station': 'lumiose-city',
  'Shalour Gate': 'shalour-city', 'Coumarine Gate': 'coumarine-city',
  'Laverre Gate': 'laverre-city', 'Anistar Gate': 'anistar-city',
  'Snowbelle Gate': 'snowbelle-city', 'Kiloude Station': 'kiloude-city',
  'Blazing Chamber': 'kalos-pokemon-league', 'Flood Chamber': 'kalos-pokemon-league',
  'Ironworks Chamber': 'kalos-pokemon-league', 'Dragonmark Chamber': 'kalos-pokemon-league',
  'Radiant Chamber': 'kalos-pokemon-league', 'Pokémon League Gate': 'kalos-pokemon-league',
}
const maps: { mapId: number; zoneId: number }[] = []
const unresolved = new Map<string, number[]>()
for (const row of rows) {
  const matches = xEncounters.locations.filter(zone => aliases[row.name] ? zone.name === aliases[row.name] : normalize(zone.names.en ?? zone.name) === normalize(row.name))
  if (matches.length === 1) maps.push({ mapId: row.mapId, zoneId: matches[0].id })
  else unresolved.set(row.name, [...unresolved.get(row.name) ?? [], row.mapId])
}
if (rows.length < 350 || new Set(rows.map(row => row.mapId)).size !== rows.length || !maps.some(row => row.mapId === 48 && row.zoneId === 614) || !maps.some(row => row.mapId === 266 && row.zoneId === 612)) throw new Error('Invalid map correspondence')
await writeFile('src/games/x/data/map-zones.json', `${JSON.stringify({ source, maps })}\n`)
console.log(JSON.stringify({ sourceRows: rows.length, mapped: maps.length, zones: new Set(maps.map(row => row.zoneId)).size, unresolved: Object.fromEntries(unresolved), omittedIds: Array.from({ length: 360 }, (_, index) => index).filter(id => !rows.some(row => row.mapId === id)), uncoveredZones: xEncounters.locations.filter(zone => !maps.some(row => row.zoneId === zone.id)).map(zone => ({ id: zone.id, name: zone.name })) }, null, 2))
