import { readXMemoryBoxes } from '../../src/games/x/memory-boxes.ts'
import type { SavedBoxPokemon } from '../../src/models/party.ts'
import { createHash } from 'node:crypto'
import { CitraRpcReader } from './rpc-reader.ts'
import { readXMemoryPokedex } from '../../src/games/x/memory-pokedex.ts'
import { serializePokedex } from '../../src/models/pokedex.ts'
import { readXMemoryParty } from '../../src/games/x/memory-party.ts'
import { readXMemoryBattle } from '../../src/games/x/memory-battle.ts'
import { readXMemoryLocation } from '../../src/games/x/memory-location.ts'
import { readXMemoryDaycare } from '../../src/games/x/memory-daycare.ts'

// Fingerprint of the locally validated X executable image, not a universal XY profile.
// Only hashes are retained; no ROM bytes are written to disk or exposed by the bridge.
export const X_SESSION_FINGERPRINT = '6dc47f0bfdd12a45e7a463eb126e4343c4f156574e520e696f1e6cc1ae5421a3'
export class XProfileMismatch extends Error {}
export function createXSessionReader() {
  const rpc = new CitraRpcReader()
  async function checkProfile() {
    const hash = createHash('sha256')
    for (const address of [0x100000, 0x110000, 0x120000]) hash.update(await rpc.read(address, 64))
    if (hash.digest('hex') !== X_SESSION_FINGERPRINT) throw new XProfileMismatch('profileMismatch')
  }
  return {
    checkProfile,
    async read(includeBoxes = false) {
      await checkProfile()
      const party = await readXMemoryParty(rpc)
      const pokedex = serializePokedex(await readXMemoryPokedex(rpc))
      let boxes: SavedBoxPokemon[] | undefined
      if (includeBoxes) {
        try {
          boxes = await readXMemoryBoxes(rpc)
          const after = await readXMemoryParty(rpc)
          const identity = (members: typeof party) => members.map(p => `${p.personality}:${p.trainerId}:${p.speciesId}`).join(',')
          if (identity(party) !== identity(after)) throw new Error('Party moved during X boxes read')
          await checkProfile()
        } catch (error) {
          if (error instanceof XProfileMismatch) throw error
          boxes = undefined
        }
      }
      const battle = await readXMemoryBattle(rpc, party).catch(() => null)
      const position = await readXMemoryLocation(rpc).catch(() => null)
      const daycare = await readXMemoryDaycare(rpc).catch(() => null)
      await checkProfile()
      return { party, pokedex, boxes, battle, position, daycare }
    },
    close: () => rpc.close(),
  }
}
