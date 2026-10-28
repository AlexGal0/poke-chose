// Keep one small metadata sample in RAM, then compare the next active battle
// with a different rival roster size. No memory files or game control.
import { setTimeout } from 'node:timers/promises'
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { createXSessionReader } from '../bridge/citra/x-session.ts'
import { probeXBattleMetadataSample, compareXBattleMetadata } from '../bridge/citra/x-battle-probe.ts'

const profile = createXSessionReader()
const rpc = new CitraRpcReader()
const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
try {
  await profile.checkProfile()
  const baseline = await probeXBattleMetadataSample(rpc)
  if (view(baseline).getUint32(0x170, true) !== 0x40001) throw new Error('Prepare an active baseline battle first')
  const count = view(baseline).getUint32(0x2b8, true)
  console.log(JSON.stringify({ readOnly: true, baselineRosterCount: count, waitingForDifferentBattle: true }))
  let compared = false
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    await setTimeout(2000)
    // Loading another encounter can briefly stop RPC responses. Keep the
    // in-memory baseline until the deadline instead of losing it on a timeout.
    let flag: Buffer
    try { flag = await rpc.read(0x081fb170, 4) } catch { continue }
    if (flag.length !== 4 || flag.readUInt32LE(0) !== 0x40001) continue
    let next: Uint8Array
    try { next = await probeXBattleMetadataSample(rpc) } catch { continue }
    if (view(next).getUint32(0x170, true) !== 0x40001 || view(next).getUint32(0x2b8, true) === count) continue
    await profile.checkProfile()
    console.log(JSON.stringify({ readOnly: true, profileMatched: true, researchOnly: true,
      beforeRosterCount: count, afterRosterCount: view(next).getUint32(0x2b8, true),
      changedScalarCandidates: compareXBattleMetadata(baseline, next).map(change => ({ ...change, address: `0x${change.address.toString(16)}` })),
    }, null, 2))
    compared = true
    break
  }
  if (!compared) throw new Error('No different stable battle before timeout')
} catch (error) {
  console.error('[x-battle-context-compare]', error instanceof Error ? error.message : 'Read failed')
  process.exitCode = 1
} finally { rpc.close(); profile.close() }
