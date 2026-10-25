// Download a fixed public catalog, never IDs from a save or emulator.
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const catalog = JSON.parse(await readFile('src/games/x/data/roster.json', 'utf8')).catalog
const queue = [...new Set(catalog.map(pokemon => pokemon.pokemonId))]
const manifest = {}
await mkdir('public/battle-sprites', { recursive: true })
await Promise.all(Array.from({ length: 10 }, async () => {
  while (queue.length) {
    const id = queue.shift()
    const path = `public/battle-sprites/${id}.gif`
    let bytes
    try { bytes = await readFile(path) } catch { /* Fetch missing public assets. */ }
    if (!bytes) {
      const response = await fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`, { signal: AbortSignal.timeout(30000) })
      if (response.status === 404) continue
      if (!response.ok) throw new Error(`Sprite ${id}: ${response.status}`)
      bytes = new Uint8Array(await response.arrayBuffer())
      if (Buffer.from(bytes.subarray(0, 6)).toString() !== 'GIF89a' && Buffer.from(bytes.subarray(0, 6)).toString() !== 'GIF87a') throw new Error(`Invalid GIF ${id}`)
      await writeFile(path, bytes)
    }
    manifest[id] = `/battle-sprites/${id}.gif`
  }
}))
await writeFile('src/sources/battle-sprites.json', `${JSON.stringify(manifest)}\n`)
console.log(`Stored ${Object.keys(manifest).length} local animated front sprites`)
