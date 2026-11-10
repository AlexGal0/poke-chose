import { mkdir, writeFile } from 'node:fs/promises'

// XY forms only, including the distributed Blazikenite. Stones can be traded
// between X and Y, so ownership is not filtered by where a stone is obtainable.
const pairs = [
  ['venusaur', 'venusaurite'], ['charizard', 'charizardite-x', 'x'], ['charizard', 'charizardite-y', 'y'],
  ['blastoise', 'blastoisinite'], ['alakazam', 'alakazite'], ['gengar', 'gengarite'],
  ['kangaskhan', 'kangaskhanite'], ['pinsir', 'pinsirite'], ['gyarados', 'gyaradosite'],
  ['aerodactyl', 'aerodactylite'], ['mewtwo', 'mewtwonite-x', 'x'], ['mewtwo', 'mewtwonite-y', 'y'],
  ['ampharos', 'ampharosite'], ['scizor', 'scizorite'], ['heracross', 'heracronite'],
  ['houndoom', 'houndoominite'], ['tyranitar', 'tyranitarite'], ['blaziken', 'blazikenite'],
  ['gardevoir', 'gardevoirite'], ['mawile', 'mawilite'], ['aggron', 'aggronite'],
  ['medicham', 'medichamite'], ['manectric', 'manectite'], ['banette', 'banettite'],
  ['absol', 'absolite'], ['garchomp', 'garchompite'], ['lucario', 'lucarionite'], ['abomasnow', 'abomasite'],
]
const root = new URL('../', import.meta.url)
const assetDir = new URL('public/mega-evolutions/', root)
await mkdir(assetDir, { recursive: true })
const generations = ['generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v', 'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix']
const stats = pokemon => Object.fromEntries(pokemon.stats.map(row => {
  const past = pokemon.past_stats.filter(past => generations.indexOf(past.generation.name) + 1 >= 6 && past.stats.some(stat => stat.stat.name === row.stat.name))
    .sort((a, b) => generations.indexOf(a.generation.name) - generations.indexOf(b.generation.name))[0]
  return [row.stat.name, past?.stats.find(stat => stat.stat.name === row.stat.name)?.base_stat ?? row.base_stat]
}))
const cache = new Map()
function resource(path) {
  if (!cache.has(path)) cache.set(path, fetch(`https://pokeapi.co/api/v2/${path}`).then(response => {
    if (!response.ok) throw new Error(`Failed ${path}: ${response.status}`)
    return response.json()
  }))
  return cache.get(path)
}
async function asset(url, name) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed asset ${url}`)
  await writeFile(new URL(name, assetDir), Buffer.from(await response.arrayBuffer()))
  return `/mega-evolutions/${name}`
}
const entries = new Array(pairs.length)
let next = 0
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < pairs.length) {
    const index = next++
    const [name, stone, variant] = pairs[index]
    const megaName = `${name}-mega${variant ? `-${variant}` : ''}`
    const [base, mega, item] = await Promise.all([resource(`pokemon/${name}`), resource(`pokemon/${megaName}`), resource(`item/${stone}`)])
    const gameIndex = item.game_indices.find(row => row.generation.name === 'generation-vi')?.game_index
    if (!gameIndex || mega.is_default || mega.name !== megaName) throw new Error(`Invalid mega ${stone}`)
    const [sprite, megaSprite, stoneIcon] = await Promise.all([
      asset(base.sprites.other['official-artwork'].front_default, `${name}.png`),
      asset(mega.sprites.other['official-artwork'].front_default, `${megaName}.png`),
      asset(item.sprites.default, `${stone}.png`),
    ])
    entries[index] = { id: stone, inventoryKey: String(gameIndex), speciesId: base.id, name, variant: variant?.toUpperCase() ?? null,
      stoneNames: Object.fromEntries(['es', 'en'].map(locale => [locale, item.names.find(row => row.language.name === locale)?.name ?? item.name])),
      sprite, megaSprite, stoneIcon, baseStats: stats(base), megaStats: stats(mega),
      types: base.types.map(row => row.type.name), megaTypes: mega.types.map(row => row.type.name) }
  }
}))
await writeFile(new URL('src/games/xy/data/mega-evolutions.json', root), `${JSON.stringify({ generation: 6, versionGroup: 'x-y', source: 'https://pokeapi.co/api/v2/', retrieved: new Date().toISOString().slice(0, 10), entries }, null, 2)}\n`)
console.log(`Imported ${entries.length} XY mega forms`)
