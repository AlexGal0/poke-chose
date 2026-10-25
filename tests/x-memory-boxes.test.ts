import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readXMemoryBoxes, X_MEMORY_BOXES_ADDRESS, X_MEMORY_BOXES_SIZE } from '../src/games/x/memory-boxes.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'

function fixture() {
  const bytes = Buffer.alloc(X_MEMORY_BOXES_SIZE)
  for (const index of [0, 29, 30, 929]) fixturePk6({ speciesId: index === 929 ? 721 : 700 }).copy(bytes, index * 232)
  return bytes
}
test('X memory boxes read 31×30 encrypted slots, preserve boundaries and omit empty slots', async () => {
  const bytes = fixture()
  const before = Buffer.from(bytes)
  let reads = 0
  const boxes = await readXMemoryBoxes({ async read(address, length) {
    assert.ok(length <= 4096)
    reads++
    return bytes.subarray(address - X_MEMORY_BOXES_ADDRESS, address - X_MEMORY_BOXES_ADDRESS + length)
  } })
  assert.equal(reads, 2 * Math.ceil(bytes.length / 4096))
  assert.deepEqual(boxes.map(p => [p.box, p.slot, p.speciesId]), [[0, 0, 700], [0, 29, 700], [1, 0, 700], [30, 29, 721]])
  assert.deepEqual(bytes, before)
  assert.deepEqual(await readXMemoryBoxes({ async read(_address, size) { return new Uint8Array(size) } }), [])
})
test('X memory boxes reject partial reads, corrupt records and changes between complete passes', async () => {
  for (const mode of ['short', 'corrupt', 'changed']) {
    const bytes = fixture()
    if (mode === 'corrupt') bytes[20] ^= 1
    let calls = 0
    await assert.rejects(readXMemoryBoxes({ async read(address, size) {
      calls++
      if (mode === 'short') return bytes.subarray(0, 5)
      if (mode === 'changed' && calls > Math.ceil(bytes.length / 4096)) bytes[0] ^= 1
      return bytes.subarray(address - X_MEMORY_BOXES_ADDRESS, address - X_MEMORY_BOXES_ADDRESS + size)
    } }))
  }
})
