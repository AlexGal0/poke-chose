import test from 'node:test'
import assert from 'node:assert/strict'
import { locateStorage, parseBoxes, readBoxes, readPokedex } from '../storage.mjs'
import { pk5Fixture, saveFixture, refreshFixtureChecksums } from '../../../tests/helpers/save-fixture.ts'

test('storage discovery validates 24 boxes and rejects a damaged occupied slot', () => {
  const save = saveFixture()
  pk5Fixture(531).copy(save, 0x400, 0, 136)
  pk5Fixture(522, 23, 10).copy(save, 0x400 + 23 * 4096 + 29 * 136, 0, 136)
  save[0x21608] = 1
  save[0x2165c] = 1
  refreshFixtureChecksums(save)
  const ram = Buffer.from(save.subarray(0, 0x24000))
  const report = locateStorage(ram, 0x02000000, save)
  assert.ok(report.layouts.some(layout => layout.boxesAddress === 0x02000400 && layout.boxStride === 4096 && layout.matches === 2))
  assert.ok(report.pokedex.some(candidate => candidate.pokedexAddress === 0x02021600 && candidate.confirmedLive === false))
  ram[0x400 + 23 * 4096 + 29 * 136 + 8] ^= 1
  assert.throws(() => parseBoxes(ram.subarray(0x400, 0x400 + 23 * 4096 + 4080), 4096), /Checksum/)
})

test('box reader preserves last box positions, detects movement and rejects changing snapshots', async () => {
  let data = Buffer.alloc(23 * 4096 + 4080)
  pk5Fixture(522).copy(data, 23 * 4096 + 29 * 136, 0, 136)
  const reader = { readMemory: async () => Buffer.from(data) }
  const config = { boxesAddress: 0x02000000, boxStride: 4096 }
  assert.deepEqual((await readBoxes(reader, config)).map(p => [p.speciesId, p.box, p.slot]), [[522, 23, 29]])
  data = Buffer.alloc(data.length)
  pk5Fixture(522).copy(data, 0, 0, 136)
  assert.deepEqual((await readBoxes(reader, config)).map(p => [p.speciesId, p.box, p.slot]), [[522, 0, 0]])
  let calls = 0
  reader.readMemory = async () => { const bytes = Buffer.from(data); bytes[0] ^= calls++ % 2; return bytes }
  await assert.rejects(readBoxes(reader, config), /cambiaron/)
})

test('live dex keeps seen and caught independent and rejects inconsistent samples', async () => {
  const bytes = Buffer.alloc(0x4d4)
  bytes[0x5c] = 1
  const reader = { readMemory: async () => Buffer.from(bytes) }
  assert.deepEqual(await readPokedex(reader, { pokedexAddress: 0x02000000 }), { caughtSpeciesIds: [], seenSpeciesIds: [1] })
  bytes[8] = 1
  assert.deepEqual(await readPokedex(reader, { pokedexAddress: 0x02000000 }), { caughtSpeciesIds: [1], seenSpeciesIds: [1] })
  let calls = 0
  reader.readMemory = async () => { const sample = Buffer.from(bytes); sample[8] = calls++ % 2; return sample }
  await assert.rejects(readPokedex(reader, { pokedexAddress: 0x02000000 }), /cambiaron/)
})
