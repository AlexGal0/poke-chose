import { fixturePk6 } from './x-roster-fixture.ts'
import { readPartyPk6 } from '../../src/games/x/pk6.ts'
import { X_MEMORY_PARTY_CANDIDATE } from '../../src/games/x/memory-party.ts'
import { X_BATTLE_FIELD_TABLES } from '../../src/games/x/memory-battle-field.ts'
import { X_BATTLE_STATE_ADDRESS, X_BATTLE_ENEMY_PARTY_PROFILES, X_BATTLE_STAGES_OFFSET } from '../../src/games/x/memory-battle.ts'
import { X_BATTLE_FORMAT_HANDLERS, X_BATTLE_FORMAT_SELECTOR } from '../../src/games/x/memory-battle-format.ts'
import type { GeneralCombatFormat } from '../../src/games/core/combat.ts'

export function xBattleFieldFixture(format: GeneralCombatFormat = 'double', order = [0, 1, 2, 3, 4, 5], enemyOrder?: number[]) {
  const memory = new Map<number, number>()
  const put = (address: number, bytes: Uint8Array) => bytes.forEach((byte, index) => memory.set(address + index, byte))
  const word = (address: number, value: number) => { const bytes = Buffer.alloc(4); bytes.writeUInt32LE(value >>> 0); put(address, bytes) }
  const enemyCount = format === 'horde' ? 5 : 3
  const ownPk6 = Array.from({ length: 6 }, (_, i) => fixturePk6({ party: true, speciesId: i === 1 ? 619 : 372, personality: i + 1, level: 40 }))
  const enemyPk6 = Array.from({ length: enemyCount }, (_, i) => fixturePk6({ party: true, speciesId: 316, personality: i + 100, level: 5 }))
  const party = ownPk6.map((bytes, slot) => readPartyPk6(bytes, slot))
  const install = (core: number, bytes: Buffer) => {
    const links = Buffer.alloc(12); links.writeUInt32LE(core, 4); links.writeUInt32LE(core + 344, 8)
    put(core - 64, links); put(core, bytes.subarray(0, 232)); put(core + 344, bytes.subarray(232, 254))
  }
  ownPk6.forEach((bytes, index) => install(X_MEMORY_PARTY_CANDIDATE.firstMember + index * 484, bytes))
  for (const profile of X_BATTLE_ENEMY_PARTY_PROFILES) {
    const table = Buffer.alloc(28); table.writeUInt32LE(enemyCount, 24)
    enemyPk6.forEach((bytes, slot) => { const core = profile.firstMember + slot * 484; install(core, bytes); table.writeUInt32LE(core - 64, slot * 4) })
    put(profile.tableAddress, table)
  }
  word(X_BATTLE_STATE_ADDRESS, 0x40001)
  const handler = X_BATTLE_FORMAT_HANDLERS[format]
  word(X_BATTLE_FORMAT_SELECTOR, handler.selector)
  word(handler.ownInstruction, 0xe3a03000 | (format === 'double' ? 2 : 1))
  word(handler.enemyInstruction, 0xe3a03000 | (format === 'horde' ? 5 : format === 'double' ? 2 : 1))
  const pointers: number[][][] = []
  X_BATTLE_FIELD_TABLES.forEach((copies, side) => {
    pointers[side] = []
    copies.forEach((address, copy) => {
      const indices = side ? enemyOrder ?? Array.from({ length: enemyCount }, (_, i) => i) : order
      const table = Buffer.alloc(28); table.writeUInt32LE(indices.length, 24)
      pointers[side][copy] = []
      indices.forEach((slot, index) => {
        const pointer = 0x08240000 + copy * 0x10000 + side * 0x8000 + index * 0x244
        pointers[side][copy].push(pointer); table.writeUInt32LE(pointer, index * 4)
        const record = Buffer.alloc(32)
        const core = (side ? X_BATTLE_ENEMY_PARTY_PROFILES[copy].firstMember : X_MEMORY_PARTY_CANDIDATE.firstMember) + slot * 484
        record.writeUInt32LE(core - 64, 0); record.writeUInt16LE(side ? 316 : party[slot].speciesId, 12)
        record.writeUInt16LE(30, 14); record.writeUInt16LE(side ? 22 : 15, 16)
        put(pointer, record); put(pointer + X_BATTLE_STAGES_OFFSET, Buffer.from([7, 6, 6, 6, 6, 6, 6]))
      })
      put(address, table)
    })
  })
  return { party, put, word, pointers, reader: { async read(address: number, length: number) { return Buffer.from(Array.from({ length }, (_, index) => memory.get(address + index) ?? 0)) } } }
}
