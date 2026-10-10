import test from 'node:test'
import assert from 'node:assert/strict'
import { readDaycare } from '../bridge/live/daycare.mjs'
import { pk5Fixture } from './helpers/save-fixture.ts'

test('live daycare reads a stable bounded block without file CRC and rejects unstable or corrupt samples', async () => {
  const block = Buffer.alloc(460)
  block.writeUInt32LE(1)
  pk5Fixture(506, 4, 0, undefined, { experience: 96, currentHp: 20, maxHp: 20 }).copy(block, 4)
  block.writeUInt32LE(2288, 224)
  block[456] = 1
  let calls = 0
  const reader = { async readMemory(address: number, length: number) {
    assert.equal(address, 0x0223c96c)
    assert.equal(length, 460)
    calls++
    return Buffer.from(block)
  } }
  assert.equal(await readDaycare(reader, {}), null)
  assert.equal(calls, 0)
  const result = await readDaycare(reader, { daycareAddress: '0x0223c96c' })
  assert.equal(result.slots[0].gainedExperience, 2288)
  assert.equal(result.eggAvailable, true)
  assert.equal(calls, 2)
  for (const address of [0x019ffffc, 0x023ffffc, 0x0223c96d, 'invalid']) await assert.rejects(readDaycare(reader, { daycareAddress: address }), /address/)
  let changed = false
  await assert.rejects(readDaycare({ async readMemory() { const bytes = Buffer.from(block); bytes[456] = Number(changed = !changed); return bytes } }, { daycareAddress: 0x0223c96c }), /Unstable/)
  block.writeUInt32LE(2)
  await assert.rejects(readDaycare(reader, { daycareAddress: 0x0223c96c }), /occupancy/)
})
