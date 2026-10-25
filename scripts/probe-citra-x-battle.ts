// Read-only, bounded diagnostics for the installed X session. No memory dumps.
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { createXSessionReader } from '../bridge/citra/x-session.ts'
import { readPk6 } from '../src/games/x/pk6.ts'
import { xLevelFromExperience } from '../src/games/x/experience.ts'
import { readXMemoryParty } from '../src/games/x/memory-party.ts'
import { readXMemoryBattle } from '../src/games/x/memory-battle.ts'

const session = createXSessionReader()
const rpc = new CitraRpcReader()
try {
  // Require the locally validated executable fingerprint before probing candidates.
  await session.checkProfile()
  const party = await readXMemoryParty(rpc)
  const snapshot = { party, battle: await readXMemoryBattle(rpc, party).catch(() => null) }
  console.log(JSON.stringify({ confirmed: snapshot.battle ? { active: snapshot.battle.active, own: snapshot.battle.own && { speciesId: snapshot.battle.own.speciesId, hp: snapshot.battle.own.currentHp, maxHp: snapshot.battle.own.maxHp }, enemy: snapshot.battle.enemy && { speciesId: snapshot.battle.enemy.speciesId, hp: snapshot.battle.enemy.currentHp, maxHp: snapshot.battle.enemy.maxHp } } : null }))
  console.log(JSON.stringify({ party: snapshot.party.map(p => ({ speciesId: p.speciesId, level: p.level, hp: p.currentHp, maxHp: p.maxHp })) }))
  for (const address of [0x081feba0, 0x081ff744]) {
    try {
      const pokemon = readPk6(await rpc.read(address, 232))
      console.log(JSON.stringify({ pk6Address: address.toString(16), speciesId: pokemon?.speciesId, form: pokemon?.form, levelFromExperience: pokemon ? xLevelFromExperience(pokemon.speciesId, pokemon.experience) : null }))
    } catch { console.log(JSON.stringify({ pk6Address: address.toString(16), valid: false })) }
  }
  for (const address of [0x081fb284, 0x081fb624, 0x081fb2a0, 0x081fb640]) {
    const bytes = await rpc.read(address, 4)
    const pointer = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true)
    if (pointer < 0x08000000 || pointer > 0x08df0000) {
      console.log(JSON.stringify({ address: address.toString(16), pointer: pointer.toString(16), validPointer: false }))
      continue
    }
    const block = await rpc.read(pointer, 64)
    const stages = await rpc.read(pointer + 0x104, 7)
    const view = new DataView(block.buffer, block.byteOffset, block.byteLength)
    console.log(JSON.stringify({ address: address.toString(16), pointer: pointer.toString(16),
      speciesId: view.getUint16(0x0c, true),
      stagesCandidate: Array.from(stages),
      maxHpCandidate: view.getUint16(0x0e, true), hpCandidate: view.getUint16(0x10, true),
      speciesCandidates: Array.from({ length: 16 }, (_, i) => ({ offset: i * 2, value: view.getUint16(i * 2, true) })).filter(row => [447, 129].includes(row.value)) }))
  }
} finally { rpc.close(); session.close() }
