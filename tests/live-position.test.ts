import test from 'node:test'
import assert from 'node:assert/strict'
import { readPlayerPosition } from '../bridge/live/position.mjs'
import { isPlayerPosition } from '../src/models/player-position.ts'

test('live map field reads stable uint16 without inventing coordinates', async () => {
  const reads: number[][] = []
  const reader = { readMemory: async (address: number, length: number) => {
    reads.push([address, length])
    return Buffer.from([0x4b, 0x01])
  } }
  const position = await readPlayerPosition(reader, { mapAddress: '0x021e4bc2' })
  assert.deepEqual(position, { mapId: 331 })
  assert.deepEqual(reads, [[0x021e4bc2, 2], [0x021e4bc2, 2]])
  assert.equal(isPlayerPosition(position), true)
  assert.equal(isPlayerPosition({ mapId: 331, x: 1 }), false)
})

test('live map field rejects ambiguity, invalid addresses, truncated and changing values', async () => {
  const reader = { readMemory: () => { throw new Error('Unexpected read') } }
  await assert.rejects(readPlayerPosition(reader, { mapAddress: 0x021e4bc2, positionBlockAddress: 0x0223506c }), /no ambos/)
  for (const address of [null, '', -1, 0x021e4bc3, 0x02400000, 'invalid']) {
    await assert.rejects(readPlayerPosition(reader, { mapAddress: address }), /fuera/)
  }
  await assert.rejects(readPlayerPosition({ readMemory: async () => Buffer.alloc(1) }, { mapAddress: 0x021e4bc2 }), /descartada/)
  let count = 0
  await assert.rejects(readPlayerPosition({ readMemory: async () => Buffer.from([++count, 0]) }, { mapAddress: 0x021e4bc2 }), /descartada/)
})

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
