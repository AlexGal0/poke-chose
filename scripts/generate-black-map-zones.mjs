import { readFile } from 'node:fs/promises'
import { extractBlackLocations } from './rom/black-locations.mjs'
import { matchRomLocations } from './rom/match-locations.mjs'
import { blackZoneLocations } from '../src/domain/black-zones.ts'

const path = process.argv[2]
if (!path || process.argv.length !== 3) {
  console.error('Usage: node --experimental-strip-types scripts/generate-black-map-zones.mjs <local-rom.nds>')
  process.exitCode = 1
} else {
  try {
    const catalog = extractBlackLocations(await readFile(path))
    const labels = JSON.parse(await readFile(new URL('../src/i18n/locales/es/translation.json', import.meta.url), 'utf8')).zones.list
    const result = matchRomLocations(catalog.maps, blackZoneLocations(), labels)
    const lines = result.groups.map(group => `  [${group.locationId}, [${group.mapIds.join(', ')}]],`)
    console.log('// Generated from Spanish Black IRBS revision 0. See docs/es/rom-locations.md.\n// Only derived map-to-zone IDs; no ROM bytes or text banks.\nexport const BLACK_MAP_ZONES: readonly (readonly [number, readonly number[]])[] = [\n' + lines.join('\n') + '\n]')
    console.error(`Resolved ${catalog.maps.length - result.unresolved.length}/${catalog.maps.length} maps to ${result.groups.length} zones. Unresolved IDs: ${result.unresolved.join(', ')}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
