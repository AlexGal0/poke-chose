import { xLevelFromExperience } from '../src/games/x/experience.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readXMemoryBattle, X_BATTLE_POINTERS, X_BATTLE_STATE_ADDRESS, X_BATTLE_ENEMY_COPIES, X_BATTLE_ENEMY_PARTY_PROFILES, X_BATTLE_STAGES_OFFSET, decodeXBattleStages } from '../src/games/x/memory-battle.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'
import { readPartyPk6 } from '../src/games/x/pk6.ts'
import { isBattleReading } from '../src/models/battle.ts'
import { emptyLivePartySnapshot, isLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'

function fixture() {
  const party = [readPartyPk6(fixturePk6({ party: true, speciesId: 447 }), 0)]
  const memory = new Map<number, Buffer>()
  const flag = Buffer.alloc(4); flag.writeUInt32LE(0x40001); memory.set(X_BATTLE_STATE_ADDRESS, flag)
  X_BATTLE_POINTERS.forEach((address, i) => {
    const p = Buffer.alloc(4), pointer = 0x08200000 + i * 512
    p.writeUInt32LE(pointer); memory.set(address, p)
    const bytes = Buffer.alloc(32)
    bytes.writeUInt16LE(i < 2 ? 447 : 129, 12); bytes.writeUInt16LE(30, 14); bytes.writeUInt16LE(i < 2 ? 15 : 22, 16)
    memory.set(pointer, bytes)
    memory.set(pointer + X_BATTLE_STAGES_OFFSET, Buffer.from(i < 2 ? [7, 6, 7, 6, 6, 6, 6] : [2, 6, 6, 6, 6, 6, 6]))
  })
  const rival = fixturePk6({ party: true, speciesId: 129, level: 9 })
  for (const profile of X_BATTLE_ENEMY_PARTY_PROFILES) {
    const table = Buffer.alloc(28)
    table.writeUInt32LE(profile.firstMember - 64, 0)
    table[24] = 1
    const object = Buffer.alloc(12)
    object.writeUInt32LE(profile.firstMember, 4)
    object.writeUInt32LE(profile.firstMember + 344, 8)
    memory.set(profile.firstMember - 64, object)
    memory.set(profile.tableAddress, table)
    memory.set(profile.firstMember, rival.subarray(0, 232))
    memory.set(profile.firstMember + 344, rival.subarray(232, 254))
  }
  const reader = { async read(address: number, length: number) { return memory.get(address)?.subarray(0, length) ?? Buffer.alloc(length) } }
  return { memory, reader, party }
}

test('battle reader confirms both copies, resolves the active party member and clears on exit', async () => {
  const f = fixture()
  const battle = await readXMemoryBattle(f.reader, f.party)
  assert.equal(battle.active, true)
  assert.equal(battle.opponentRosterTotal, 1)
  assert.equal(battle.own?.speciesId, 447)
  assert.equal(battle.own?.partySlot, 0)
  assert.equal(battle.enemy?.speciesId, 129)
  assert.equal(battle.enemy?.currentHp, 22)
  assert.equal(battle.enemy?.level, 9)
  assert.equal(battle.own?.statStages?.attack, 1)
  assert.equal(battle.own?.statStages?.specialAttack, 1)
  assert.equal(battle.enemy?.statStages?.attack, -4)
  assert.ok(isBattleReading(battle, 721))
  X_BATTLE_POINTERS.forEach(p => f.memory.set(p, Buffer.alloc(4)))
  f.memory.get(X_BATTLE_STATE_ADDRESS)!.writeUInt32LE(0x40000)
  assert.deepEqual(await readXMemoryBattle(f.reader, f.party), { active: false, own: null, enemy: null })
  const inactiveValues = [0x20, 0, 0x597774, 0]
  X_BATTLE_POINTERS.forEach((address, i) => { const bytes = Buffer.alloc(4); bytes.writeUInt32LE(inactiveValues[i]); f.memory.set(address, bytes) })
  assert.deepEqual(await readXMemoryBattle(f.reader, f.party), { active: false, own: null, enemy: null })
})

test('battle reader never identifies an ambiguous party copy and rejects mismatched or corrupt rivals', async () => {
  const f = fixture()
  assert.equal((await readXMemoryBattle(f.reader, [...f.party, { ...f.party[0], slot: 1 }])).own, null)
  f.memory.get(0x08200000 + 512)!.writeUInt16LE(10, 16)
  await assert.rejects(readXMemoryBattle(f.reader, f.party))
  const g = fixture(); g.memory.get(X_BATTLE_ENEMY_COPIES[0])![10] ^= 1
  await assert.rejects(readXMemoryBattle(g.reader, g.party))
  const h = fixture(); h.memory.set(X_BATTLE_ENEMY_COPIES[1], fixturePk6({ speciesId: 406 }))
  await assert.rejects(readXMemoryBattle(h.reader, h.party))
})

test('partial pointers, truncation and transitions are never reported as a confirmed battle', async () => {
  const f = fixture(); f.memory.set(X_BATTLE_POINTERS[0], Buffer.alloc(4))
  await assert.rejects(readXMemoryBattle(f.reader, f.party))
  const g = fixture(); g.memory.set(0x08200000, Buffer.alloc(2))
  await assert.rejects(readXMemoryBattle(g.reader, g.party))
  const h = fixture(); let reads = 0
  await assert.rejects(readXMemoryBattle({ async read(address, length) {
    if (address === X_BATTLE_POINTERS[0] && ++reads >= 3) return Buffer.alloc(4)
    return h.reader.read(address, length)
  } }, h.party))
})

test('released or rebuilding participant tables cannot end a battle while the explicit X flag is active', async () => {
  const f = fixture()
  X_BATTLE_POINTERS.forEach(p => f.memory.set(p, Buffer.alloc(4)))
  await assert.rejects(readXMemoryBattle(f.reader, f.party))
  f.memory.get(X_BATTLE_STATE_ADDRESS)!.writeUInt32LE(0x40000)
  assert.equal((await readXMemoryBattle(f.reader, f.party)).active, false)
})

test('optional live battle payload is validated without widening Black or trusting malformed health', async () => {
  const f = fixture(), battle = await readXMemoryBattle(f.reader, f.party)
  const ready = { ...emptyLivePartySnapshot(), enabled: true, status: 'ready', message: 'ready', party: f.party, pokedex: { seenSpeciesIds: [447], caughtSpeciesIds: [] }, updatedAt: new Date().toISOString(), battle }
  assert.ok(isLivePartySnapshot(ready))
  assert.equal(isLivePartySnapshot({ ...ready, battle: { ...battle, enemy: { ...battle.enemy, currentHp: 99 } } }), false)
  assert.equal(isBattleReading({ active: false, own: null, enemy: battle.enemy }, 721), false)
  assert.equal(isBattleReading({ ...battle, enemy: null }, 721), false)
})


test('X stages decode all seven fields and reject invalid or incomplete values', () => {
  assert.deepEqual(decodeXBattleStages(Uint8Array.from([0, 12, 7, 5, 8, 4, 6])), {
    attack: -6, defense: 6, specialAttack: 1, specialDefense: -1, speed: 2, accuracy: -2, evasion: 0,
  })
  assert.equal(decodeXBattleStages(Uint8Array.from([6, 6, 6])), null)
  assert.equal(decodeXBattleStages(Uint8Array.from([13, 6, 6, 6, 6, 6, 6])), null)
})

test('unconfirmed stages do not discard confirmed identity and health or leak stale stages', async () => {
  const f = fixture()
  f.memory.set(0x08200000 + X_BATTLE_STAGES_OFFSET, Buffer.from([13, 6, 6, 6, 6, 6, 6]))
  let battle = await readXMemoryBattle(f.reader, f.party)
  assert.equal(battle.own?.statStages, null)
  assert.equal(battle.enemy?.statStages?.attack, -4)
  f.memory.set(0x08200000 + 2 * 512 + X_BATTLE_STAGES_OFFSET, Buffer.from([6, 6, 6, 6, 6, 6, 6]))
  battle = await readXMemoryBattle(f.reader, f.party)
  assert.equal(battle.enemy?.statStages, null)
  assert.equal(battle.enemy?.currentHp, 22)
  assert.equal(isBattleReading({ ...battle, enemy: { ...battle.enemy, statStages: { attack: 0 } } }, 721), false)
  assert.equal(isBattleReading({ ...battle, own: { ...battle.own, statStages: { attack: 7, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 } } }, 721), false)
})


test('X rival level uses the species growth curve and exact EXP thresholds locally', () => {
  assert.equal(xLevelFromExperience(129, 1249), 9)
  assert.equal(xLevelFromExperience(129, 1250), 10)
  assert.equal(xLevelFromExperience(669, 342), 6)
  assert.equal(xLevelFromExperience(669, 343), 7)
  assert.equal(xLevelFromExperience(669, undefined), null)
  assert.equal(xLevelFromExperience(999, 1000), null)
  assert.equal(xLevelFromExperience(669, -1), null)
})


test('trainer battles select the third rival from validated teams instead of the first PK6', async () => {
  const f = fixture()
  const trainer = [
    fixturePk6({ party: true, speciesId: 84, level: 24, constant: 0x11111111 }),
    fixturePk6({ party: true, speciesId: 210, level: 24, constant: 0x22222222 }),
    fixturePk6({ party: true, speciesId: 694, level: 25, constant: 0x33333333 }),
  ]
  for (const profile of X_BATTLE_ENEMY_PARTY_PROFILES) {
    const table = Buffer.alloc(28); table[24] = trainer.length
    trainer.forEach((bytes, slot) => {
      const address = profile.firstMember + slot * profile.stride
      table.writeUInt32LE(address - 64, slot * 4)
      const object = Buffer.alloc(12)
      object.writeUInt32LE(address, 4); object.writeUInt32LE(address + 344, 8)
      f.memory.set(address - 64, object)
      f.memory.set(address, bytes.subarray(0, 232))
      f.memory.set(address + 344, bytes.subarray(232, 254))
    })
    f.memory.set(profile.tableAddress, table)
  }
  for (const pointer of [0x08200400, 0x08200600]) f.memory.get(pointer)!.writeUInt16LE(694, 12)
  const battle = await readXMemoryBattle(f.reader, f.party)
  assert.equal(battle.enemy?.speciesId, 694)
  assert.equal(battle.enemy?.level, 25)
  assert.equal(battle.enemy?.partySlot, 2)
  assert.equal(battle.opponentRosterTotal, 3)
  assert.equal(battle.enemy?.currentHp, 22, 'live field HP take precedence over roster copies')
  assert.ok(isBattleReading(battle, 721))
  // Replacing both active field copies detects the next Pokémon, not stale identity.
  for (const pointer of [0x08200400, 0x08200600]) f.memory.get(pointer)!.writeUInt16LE(210, 12)
  const replacement = await readXMemoryBattle(f.reader, f.party)
  assert.equal(replacement.enemy?.partySlot, 1)
  assert.equal(replacement.opponentRosterTotal, 3)
})

test('trainer team validation rejects inconsistent counts, ambiguous rivals and unstable pointer tables', async () => {
  const counts = fixture()
  counts.memory.get(X_BATTLE_ENEMY_PARTY_PROFILES[1].tableAddress)![24] = 0
  await assert.rejects(readXMemoryBattle(counts.reader, counts.party))
  const ambiguous = fixture()
  for (const profile of X_BATTLE_ENEMY_PARTY_PROFILES) {
    const table = ambiguous.memory.get(profile.tableAddress)!
    table[24] = 2
    table.writeUInt32LE(profile.firstMember + profile.stride - 64, 4)
    const other = fixturePk6({ party: true, speciesId: 129, constant: 0x98765432, personality: 12345, level: 9 })
    const object = Buffer.alloc(12)
    object.writeUInt32LE(profile.firstMember + profile.stride, 4)
    object.writeUInt32LE(profile.firstMember + profile.stride + 344, 8)
    ambiguous.memory.set(profile.firstMember + profile.stride - 64, object)
    ambiguous.memory.set(profile.firstMember + profile.stride, other.subarray(0, 232))
    ambiguous.memory.set(profile.firstMember + profile.stride + 344, other.subarray(232, 254))
  }
  await assert.rejects(readXMemoryBattle(ambiguous.reader, ambiguous.party), /Unconfirmed X rival/)
  const unstable = fixture()
  let reads = 0
  await assert.rejects(readXMemoryBattle({ async read(address, length) {
    const bytes = Buffer.from(await unstable.reader.read(address, length))
    if (address === X_BATTLE_ENEMY_PARTY_PROFILES[0].tableAddress && ++reads > 1) bytes.writeUInt32LE(0, 0)
    return bytes
  } }, unstable.party))
})
