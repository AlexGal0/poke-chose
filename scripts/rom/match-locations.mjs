// Match zone labels, never numeric IDs or neighboring map entries.
const aliases = new Map([
  ['Alm. Frigoríficos', 'Almacenes Frigoríficos'],
  ['Centro Comercial', 'Centro Comercial R9'],
])

export function matchRomLocations(maps, locations, labels) {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const byName = new Map()
  for (const location of locations) {
    const label = labels[location.name]
    if (typeof label !== 'string') continue
    const key = normalize(label)
    const matches = byName.get(key) ?? []
    matches.push(location)
    byName.set(key, matches)
  }
  const groups = new Map()
  const unresolved = []
  const seen = new Set()
  for (const map of maps) {
    if (!Number.isInteger(map.mapId) || map.mapId < 0 || seen.has(map.mapId)) throw new Error('Invalid or duplicate map ID')
    seen.add(map.mapId)
    const matches = byName.get(normalize(aliases.get(map.name) ?? map.name)) ?? []
    if (matches.length !== 1) {
      unresolved.push(map.mapId)
      continue
    }
    const location = matches[0]
    const group = groups.get(location.id) ?? { locationId: location.id, mapIds: [] }
    group.mapIds.push(map.mapId)
    groups.set(location.id, group)
  }
  return { groups: [...groups.values()].sort((a, b) => a.locationId - b.locationId), unresolved }
}
