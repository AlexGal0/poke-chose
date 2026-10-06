import { readFile, writeFile, readdir } from 'node:fs/promises'
import { locateStorage } from './storage.mjs'

const root = new URL('./', import.meta.url)
const config = JSON.parse(await readFile(new URL('config.local.json', root), 'utf8'))
const files = (await readdir(new URL('artifacts/', root))).filter(name => /^ram-\d+\.bin$/.test(name)).sort()
if (!files.length) throw new Error('No hay volcado de RAM para analizar.')
const ram = await readFile(new URL(`artifacts/${files.at(-1)}`, root))
const save = await readFile(config.savePath)
const report = locateStorage(ram, Number(config.ramStart), save)
await writeFile(new URL('artifacts/storage-candidates.json', root), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
