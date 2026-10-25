// Bounded, read-only location investigation. No dumps and no writes to Citra or saves.
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { createXSessionReader } from '../bridge/citra/x-session.ts'
import { readXMemoryLocation } from '../src/games/x/memory-location.ts'
import { resolveXMapZone } from '../src/games/x/capture-location.ts'

const profile = createXSessionReader()
const rpc = new CitraRpcReader()
try {
  await profile.checkProfile()
  const sample = async () => {
    const player = await rpc.read(0x08c67190, 0x30)
    const warp = await rpc.read(0x08803bc0, 0x70)
    const derived = await rpc.read(0x08c6c0d0, 0x30)
    const candidate = await rpc.read(0x08c67180, 0x30)
    const mapCopy = await rpc.read(0x08c6709e, 2)
    return { playerMapId: player.readUInt16LE(0), direction: player[2], x: player.readFloatLE(16), y: player.readFloatLE(24),
      warpMapId: warp.readUInt16LE(10), warpCheck: warp.readUInt16LE(0x60), derivedMapId: derived.readUInt16LE(2), derivedX: derived.readFloatLE(8), derivedY: derived.readFloatLE(16),
      candidateMapId: candidate.readUInt16LE(0), candidateCopyId: mapCopy.readUInt16LE(0), candidateDirection: candidate[2], candidateX: candidate.readFloatLE(16), candidateZ: candidate.readFloatLE(20), candidateY: candidate.readFloatLE(24) }
  }
  const first = await sample(), second = await sample()
  const position = await readXMemoryLocation(rpc)
  console.log(JSON.stringify({ readOnly: true, profileMatched: true, stable: JSON.stringify(first) === JSON.stringify(second), position, zoneId: resolveXMapZone(position.mapId), first, second }, null, 2))
} finally { rpc.close(); profile.close() }
