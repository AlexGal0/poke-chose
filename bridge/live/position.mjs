import { parsePlayerPositionBlock, POSITION_LENGTH } from '../player-position.ts'

// Opt-in only: no default RAM address until confirmed on the running game.
export async function readPlayerPosition(reader, config) {
  if (config.positionBlockAddress === undefined) return null
  const address = Number(config.positionBlockAddress)
  if (!Number.isSafeInteger(address) || address < 0x02000000 || address + POSITION_LENGTH > 0x02400000) {
    throw new Error('Dirección del bloque de posición fuera de la RAM principal de DS.')
  }
  const first = await reader.readMemory(address, POSITION_LENGTH)
  const second = await reader.readMemory(address, POSITION_LENGTH)
  if (first.length !== POSITION_LENGTH || second.length !== POSITION_LENGTH || !Buffer.from(first).equals(Buffer.from(second))) {
    throw new Error('La posición cambió durante la lectura; muestra descartada.')
  }
  return parsePlayerPositionBlock(second)
}
