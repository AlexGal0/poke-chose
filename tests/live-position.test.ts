import test from 'node:test'
import assert from 'node:assert/strict'
import { readPlayerPosition } from '../bridge/live/position.mjs'

test('live position is opt-in and performs no reads without configuration', async () => {
  const reader = { readMemory: () => { throw new Error('Unexpected read') } }
  assert.equal(await readPlayerPosition(reader, {}), null)
})

test('reads a configured block twice and decodes the current map without a save', async () => {
  const bytes = Buffer.alloc(0x9c)
  bytes.writeUInt32LE(331, 0x80)
  bytes.writeUInt16LE(148, 0x86)
  bytes.writeUInt16LE(406, 0x8e)
  const reads: number[][] = []
  const reader = { readMemory: async (address: number, length: number) => {
    reads.push([address, length])
    return Buffer.from(bytes)
  } }
  assert.deepEqual(await readPlayerPosition(reader, { positionBlockAddress: '0x0223506c' }), { mapId: 331, x: 148, y: 406, z: 0 })
  assert.deepEqual(reads, [[0x0223506c, 0x9c], [0x0223506c, 0x9c]])
})

test('rejects unstable and truncated live samples', async () => {
  let reads = 0
  const reader = { readMemory: async () => {
    const bytes = Buffer.alloc(0x9c)
    bytes.writeUInt32LE(++reads, 0x80)
    return bytes
  } }
  await assert.rejects(readPlayerPosition(reader, { positionBlockAddress: 0x0223506c }), /cambió/)
  await assert.rejects(readPlayerPosition({ readMemory: async () => Buffer.alloc(1) }, { positionBlockAddress: 0x0223506c }), /descartada/)
})

test('rejects invalid configured addresses before touching the reader', async () => {
  const reader = { readMemory: () => { throw new Error('Unexpected read') } }
  for (const address of [null, '', 'invalid', 0, -1, 0x01ffffff, 0x023fffff, 0x02400000, 0x0223506c + 0.5]) {
    await assert.rejects(readPlayerPosition(reader, { positionBlockAddress: address }), /fuera/)
  }
})
