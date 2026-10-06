import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { locateEnemyCandidates } from './enemy.mjs'

const [filename, species] = process.argv.slice(2)
try {
  if (!filename || !species) throw new Error('Uso: node --experimental-strip-types experiments/melonds-live/find-enemy.mjs <volcado.bin> <especie>')
  const ram = await readFile(resolve(filename))
  if (ram.length !== 0x400000) throw new Error('Se necesita un volcado completo de 4 MiB desde 0x02000000.')
  const candidates = locateEnemyCandidates(ram, 0x02000000, Number(species))
  const report = { speciesId: Number(species), source: resolve(filename), representation: 'encrypted-pk5', candidates, warning: 'Coincidencias no confirmadas: pueden ser copias antiguas, equipo o PC. No prueban combate activo.' }
  await writeFile(`${resolve(filename)}.enemy.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
