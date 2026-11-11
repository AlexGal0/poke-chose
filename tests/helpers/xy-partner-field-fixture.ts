import { xBattleFieldFixture } from './x-battle-field-fixture.ts'
import { fixturePk6 } from './x-roster-fixture.ts'
import { XY_PARTNER_FIELD_TABLES } from '../../src/games/x/memory-battle-field.ts'
import { X_BATTLE_FORMAT_SELECTOR, XY_PARTNER_BATTLE_HANDLER } from '../../src/games/x/memory-battle-format.ts'
import { X_BATTLE_STAGES_OFFSET } from '../../src/games/x/memory-battle.ts'

export function xyPartnerFieldFixture(allySlot = 0) {
  const f = xBattleFieldFixture('double')
  f.word(X_BATTLE_FORMAT_SELECTOR, XY_PARTNER_BATTLE_HANDLER.selector)
  for (const [address, instruction] of XY_PARTNER_BATTLE_HANDLER.instructions) f.word(address, instruction)
  const extraPointers: number[][] = []
  for (const [ownerIndex, species] of [[678, 359, 652], [510, 559]].entries()) {
    const owner = XY_PARTNER_FIELD_TABLES[ownerIndex + 2]
    extraPointers[ownerIndex] = []
    for (const [copy, address] of owner.copies.entries()) {
      const order = ownerIndex === 0 ? [allySlot, ...species.map((_, i) => i).filter(i => i !== allySlot)] : [0, 1]
      const table = Buffer.alloc(28); table.writeUInt32LE(species.length, 24)
      for (const [index, slot] of order.entries()) {
        const core = 0x08300040 + copy * 0x10000 + ownerIndex * 0x8000 + slot * 484
        const bytes = fixturePk6({ party: true, speciesId: species[slot], personality: 500 + ownerIndex * 100 + slot, level: 40 })
        const links = Buffer.alloc(12); links.writeUInt32LE(core, 4); links.writeUInt32LE(core + 344, 8)
        f.put(core - 64, links); f.put(core, bytes.subarray(0, 232)); f.put(core + 344, bytes.subarray(232, 254))
        const pointer = 0x08400000 + copy * 0x10000 + ownerIndex * 0x8000 + index * 0x244
        if (index === 0) extraPointers[ownerIndex][copy] = pointer
        const record = Buffer.alloc(18); record.writeUInt32LE(core - 64); record.writeUInt16LE(species[slot], 12); record.writeUInt16LE(109, 14); record.writeUInt16LE(109, 16)
        f.put(pointer, record); f.put(pointer + X_BATTLE_STAGES_OFFSET, Buffer.from([6, 6, 6, 6, 6, 6, 6])); table.writeUInt32LE(pointer, index * 4)
      }
      f.put(address, table)
    }
  }
  return { ...f, extraPointers }
}
