// Fixed public Gen VI move catalog; never reads saves or accepts game-derived IDs.
import { writeFile } from 'node:fs/promises'
function csv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell.replace(/\r$/, '')); cell = ''
      if (c === '\n') { rows.push(row); row = [] }
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const header = rows.shift()
  return rows.filter(row => row.length === header.length).map(row => Object.fromEntries(row.map((value, i) => [header[i], value])))
}
async function get(name) {
  const response = await fetch(`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${name}: ${response.status}`)
  return csv(await response.text())
}

const [moves, changes, descriptions, names, types] = await Promise.all(['moves', 'move_changelog', 'move_flavor_text', 'move_names', 'types'].map(get))
const typeNames = Object.fromEntries(types.map(row => [row.id, row.identifier]))
const data = moves.filter(move => Number(move.generation_id) <= 6 && typeNames[move.type_id] !== 'shadow').map(move => {
  const later = changes.filter(row => row.move_id === move.id && Number(row.changed_in_version_group_id) > 15).sort((a, b) => Number(a.changed_in_version_group_id) - Number(b.changed_in_version_group_id))
  const prior = field => later.find(row => row[field] !== '')?.[field] ?? move[field]
  const localized = Object.fromEntries([['es', '7'], ['en', '9']].map(([locale, language]) => {
    const text = descriptions.find(row => row.move_id === move.id && row.language_id === language && row.version_group_id === '15')
    const english = descriptions.find(row => row.move_id === move.id && row.language_id === '9' && row.version_group_id === '15')
    const chosen = text ?? english
    return [locale, { name: names.find(row => row.move_id === move.id && row.local_language_id === language)?.name ?? names.find(row => row.move_id === move.id && row.local_language_id === '9')?.name ?? move.identifier,
      description: chosen?.flavor_text.replace(/\s+/g, ' ').trim() ?? null, descriptionLanguage: !text && english && locale !== 'en' ? 'en' : null }]
  }))
  return { id: Number(move.id), slug: move.identifier, type: typeNames[prior('type_id')], pp: Number(prior('pp')), power: prior('power') ? Number(prior('power')) : null, accuracy: prior('accuracy') ? Number(prior('accuracy')) : null,
    categoryId: { 1: 'status', 2: 'physical', 3: 'special' }[move.damage_class_id] ?? 'unconfirmed', localized }
})
await writeFile('src/games/x/data/move-details.json', JSON.stringify({ generation: 6, versionGroup: 'x-y', moves: data }) + '\n')
console.log(`Saved ${data.length} public Gen VI moves`)
