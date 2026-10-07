import test from 'node:test'
import assert from 'node:assert/strict'
import { findMapCandidates, sampleMapCandidates } from '../experiments/melonds-live/map-candidates.mjs'

test('candidate scan uses aligned little-endian values and respects byte offsets', () => {
  const bytes = Buffer.alloc(16)
  bytes.writeUInt16LE(331, 2)
  bytes.writeUInt16LE(331, 6)
  assert.deepEqual(findMapCandidates(bytes.subarray(2), 0x02000000, 331), [0x02000000, 0x02000004])
  assert.deepEqual(findMapCandidates(bytes.subarray(1), 0x02000001, 331), [0x02000002, 0x02000006])
  assert.throws(() => findMapCandidates(bytes, 0x02400000, 331), /RAM/)
  assert.throws(() => findMapCandidates(bytes, 0x02000000, -1), /inválido/)
})

test('candidate samples group reads and distinguish unstable numbers independently', async () => {
  let reads = 0
  const reader = { readMemory: async (address: number, length: number) => {
    assert.equal(address, 0x02000100)
    assert.equal(length, 256)
    const bytes = Buffer.alloc(256)
    bytes.writeUInt16LE(331, 2)
    bytes.writeUInt16LE(++reads, 6)
    return bytes
  } }
  assert.deepEqual(await sampleMapCandidates(reader, [0x02000102, 0x02000106]), [
    { address: 0x02000102, value: 331, stable: true },
    { address: 0x02000106, value: 2, stable: false },
  ])
  assert.equal(reads, 2)
  await assert.rejects(sampleMapCandidates(reader, [0x02000001]), /fuera/)
  await assert.rejects(sampleMapCandidates(reader, [0x02400000]), /fuera/)
})
