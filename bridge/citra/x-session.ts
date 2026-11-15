import { readXMemoryInventory } from '../../src/games/x/memory-inventory.ts'
import { inventoryReading } from '../../src/games/core/inventory.ts'
import type { InventoryReading } from '../../src/games/core/inventory.ts'
import { readXMemoryBoxes } from '../../src/games/x/memory-boxes.ts'
import type { SavedBoxPokemon } from '../../src/models/party.ts'
import { createHash } from 'node:crypto'
import type { CitraRpcOptions } from './rpc-reader.ts'
import { CitraRpcReader } from './rpc-reader.ts'
import { readXMemoryPokedex } from '../../src/games/x/memory-pokedex.ts'
import { serializePokedex } from '../../src/models/pokedex.ts'
import { readXMemoryParty } from '../../src/games/x/memory-party.ts'
import { readXMemoryBattleField } from '../../src/games/x/memory-battle-field.ts'
import { readXMemoryLocation } from '../../src/games/x/memory-location.ts'
import { readXMemoryDaycare } from '../../src/games/x/memory-daycare.ts'

// These samples match the locally tested X and Y revisions; they do not identify edition.
// Edition is checked independently against the stable trainer-status block on every read.
// Only hashes are retained; no ROM bytes are written to disk or exposed by the bridge.
export const X_SESSION_FINGERPRINT = '6dc47f0bfdd12a45e7a463eb126e4343c4f156574e520e696f1e6cc1ae5421a3'
export class XYProfileMismatch extends Error {}
export { XYProfileMismatch as XProfileMismatch }
export const XY_STATUS_ADDRESS = 0x08c79c2c
export async function checkXYEdition(reader: { read(address: number, size: number): Promise<Uint8Array> }, version: 24 | 25) {
  const first = await reader.read(XY_STATUS_ADDRESS + 4, 1)
  const second = await reader.read(XY_STATUS_ADDRESS + 4, 1)
  if (first.length !== 1 || second.length !== 1 || first[0] !== version || second[0] !== version) throw new XYProfileMismatch('profileMismatch')
}
export function createXYSessionReader(version: 24 | 25, options: CitraRpcOptions = {}) {
  const rpc = new CitraRpcReader(options)
  async function checkProfile() {
    const hash = createHash('sha256')
    for (const address of [0x100000, 0x110000, 0x120000]) hash.update(await rpc.read(address, 64))
    if (hash.digest('hex') !== X_SESSION_FINGERPRINT) throw new XYProfileMismatch('profileMismatch')
    await checkXYEdition(rpc, version)
  }
  return {
    checkProfile,
    async read(includeBoxes = false) {
      await checkProfile()
      const bagBefore = includeBoxes ? await readXMemoryInventory(rpc).catch(() => null) : null
      let inventory: InventoryReading | undefined
      const party = await readXMemoryParty(rpc)
      const pokedex = serializePokedex(await readXMemoryPokedex(rpc))
      let boxes: SavedBoxPokemon[] | undefined
      if (includeBoxes) {
        try {
          boxes = await readXMemoryBoxes(rpc)
          const after = await readXMemoryParty(rpc)
          const identity = (members: typeof party) => members.map(p => `${p.personality}:${p.trainerId}:${p.speciesId}:${p.heldItemId}:${p.isEgg}`).join(',')
          if (identity(party) !== identity(after)) throw new Error('Party moved during X boxes read')
          if (bagBefore) {
            try {
              const bagAfter = await readXMemoryInventory(rpc)
              if (JSON.stringify(bagBefore) === JSON.stringify(bagAfter)) inventory = inventoryReading(bagAfter, [...party, ...boxes])
            } catch { /* Bag unavailable: boxes and party remain independently useful. */ }
          }
          await checkProfile()
        } catch (error) {
          if (error instanceof XYProfileMismatch) throw error
          boxes = undefined
          inventory = undefined
        }
      }
      const battle = await readXMemoryBattleField(rpc, party).catch(() => null)
      const position = await readXMemoryLocation(rpc).catch(() => null)
      const daycare = await readXMemoryDaycare(rpc).catch(() => null)
      await checkProfile()
      return { inventory, party, pokedex, boxes, battle, position, daycare }
    },
    close: () => rpc.close(),
  }
}

export function createXSessionReader() { return createXYSessionReader(24, { port: Number(process.env.CITRA_X_RPC_PORT ?? 45987) }) }
