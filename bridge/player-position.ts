import type { PlayerPosition } from '../src/models/player-position.ts'

export const POSITION_OFFSET = 0x19500
export const POSITION_LENGTH = 0x9c

// Documented BW position block. No map-to-zone interpretation at this layer.
export function parsePlayerPositionBlock(bytes: Uint8Array): PlayerPosition {
  if (bytes.length !== POSITION_LENGTH) throw new Error('Bloque de posición BW incompleto.')
  const fields = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    mapId: fields.getUint32(0x80, true),
    x: fields.getUint16(0x86, true),
    y: fields.getUint16(0x8e, true),
    z: fields.getUint16(0x8a, true),
  }
}
