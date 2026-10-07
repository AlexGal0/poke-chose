import { readFile } from 'node:fs/promises'
import { extractBlackLocations } from './rom/black-locations.mjs'

const path = process.argv[2]
if (!path || process.argv.length !== 3) {
  console.error('Usage: node scripts/extract-black-locations.mjs <local-rom.nds>')
  process.exitCode = 1
} else {
  try {
    console.log(JSON.stringify(extractBlackLocations(await readFile(path)), null, 2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
