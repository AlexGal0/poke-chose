import type { MemoryReader } from './memory-party.ts'
import type { PlayerPosition } from '../../models/player-position.ts'

// Locally verified X profile. Both fields track the current map; warp buffers do not.
export const X_LOCATION_ADDRESS = 0x08c67180
export const X_LOCATION_COPY_ADDRESS = 0x08c6709e

export async function readXMemoryLocation(reader: MemoryReader): Promise<PlayerPosition> {
  async function sample() {
    const bytes = await reader.read(X_LOCATION_ADDRESS, 28)
    const copy = await reader.read(X_LOCATION_COPY_ADDRESS, 2)
    if (bytes.length !== 28 || copy.length !== 2) throw new Error('Incomplete X position')
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const mapId = view.getUint16(0, true)
    const duplicate = new DataView(copy.buffer, copy.byteOffset, copy.byteLength).getUint16(0, true)
    const coordinates = [16, 20, 24].map(offset => view.getFloat32(offset, true))
    if (mapId !== duplicate || mapId > 4095 || bytes[2] > 7 || coordinates.some(value => !Number.isFinite(value) || Math.abs(value) > 1000000)) throw new Error('Unconfirmed X position')
    return mapId
  }
  const first = await sample(), second = await sample()
  if (first !== second) throw new Error('X map changed during read')
  return { mapId: second }
}
