// ROM-specific tables list the active participant first, followed by reserves.
// Each copy allocates space for both teams, so its record bases can move.
export async function readBattleTables(reader, config) {
  const addresses = config.battlePointerTables
  if (!addresses) return null
  if (!Array.isArray(addresses) || addresses.length !== 2 || addresses.some(value => !validAddress(Number(value), 32))) throw new Error('Tablas de combate inválidas.')
  const tables = []
  for (const value of addresses) tables.push(await reader.readMemory(Number(value), 32))
  return tables
}

function validAddress(address, length) {
  return Number.isInteger(address) && address >= 0x02000000 && address + length <= 0x02400000
}

export function battleRecordAddress(table, slot) {
  const pointer = table.readUInt32LE(slot * 4)
  if (!validAddress(pointer, 28)) throw new Error('Puntero de tabla de combate inválido.')
  return pointer + 12
}

export async function confirmBattleTables(reader, config, tables) {
  const next = await readBattleTables(reader, config)
  if (!next || tables.some((table, index) => !table.equals(next[index]))) throw new Error('Las tablas de combate cambiaron durante la lectura.')
}

export async function readBattlePresence(reader, config) {
  const tables = await readBattleTables(reader, config)
  if (!tables) return null
  const next = await readBattleTables(reader, config)
  if (tables.some((table, index) => !table.equals(next[index]))) return null
  const own = tables.map(table => validAddress(table.readUInt32LE(0), 28))
  const enemy = tables.map(table => validAddress(table.readUInt32LE(28), 28))
  if (own.every(Boolean) || enemy.every(Boolean)) return true
  if (![...own, ...enemy].some(Boolean)) return false
  return null
}
