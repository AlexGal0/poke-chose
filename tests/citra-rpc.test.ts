import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSocket } from 'node:dgram'
import type { RemoteInfo } from 'node:dgram'
import { CitraRpcReader } from '../bridge/citra/rpc-reader.ts'
import { readXMemoryMember, readXMemoryParty } from '../src/games/x/memory-party.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'

async function server(handle: (packet: Buffer, peer: RemoteInfo, reply: (data: Buffer, peer?: RemoteInfo) => void) => void) {
  const socket = createSocket('udp4')
  socket.on('message', (packet, peer) => handle(packet, peer, (data, target = peer) => socket.send(data, target.port, target.address)))
  await new Promise<void>(resolve => socket.bind(0, '127.0.0.1', resolve))
  const address = socket.address()
  return { port: address.port, close: () => new Promise<void>(resolve => socket.close(resolve)) }
}
function replyFor(packet: Buffer) {
  const length = packet.readUInt32LE(20)
  const data = Buffer.alloc(16 + length)
  packet.copy(data, 0, 0, 16)
  data.writeUInt32LE(length, 12)
  for (let i = 0; i < length; i++) data[16 + i] = (packet.readUInt32LE(16) + i) & 255
  return data
}

test('Citra RPC sends only type-1 reads, fragments at 32 bytes and serializes concurrent ranges', async () => {
  const packets: Buffer[] = []
  const stub = await server((packet, _peer, reply) => { packets.push(Buffer.from(packet)); reply(replyFor(packet)) })
  const reader = new CitraRpcReader({ port: stub.port })
  try {
    const [first, second] = await Promise.all([reader.read(0x100001, 70), reader.read(0x200000, 4)])
    assert.deepEqual([...first], Array.from({ length: 70 }, (_, i) => i + 1))
    assert.deepEqual([...second], [0, 1, 2, 3])
    assert.deepEqual(packets.map(p => p.readUInt32LE(16)), [0x100001, 0x100021, 0x100041, 0x200000])
    assert.deepEqual(packets.map(p => p.readUInt32LE(20)), [32, 32, 6, 4])
    assert.equal(new Set(packets.map(p => p.readUInt32LE(4))).size, packets.length)
    for (const p of packets) { assert.equal(p.length, 24); assert.equal(p.readUInt32LE(0), 1); assert.equal(p.readUInt32LE(8), 1); assert.equal(p.readUInt32LE(12), 8) }
  } finally { reader.close(); await stub.close() }
})

test('Citra RPC ignores unrelated replies and rejects malformed matched replies', async () => {
  let badSize = false
  const stub = await server((packet, _peer, reply) => {
    const data = replyFor(packet)
    if (badSize) { data.writeUInt32LE(0, 12); reply(data); return }
    const wrongId = Buffer.from(data); wrongId.writeUInt32LE((wrongId.readUInt32LE(4) + 1) >>> 0, 4); reply(wrongId)
    const wrongVersion = Buffer.from(data); wrongVersion.writeUInt32LE(2, 0); reply(wrongVersion)
    reply(Buffer.alloc(3))
    reply(data)
  })
  const reader = new CitraRpcReader({ port: stub.port })
  try {
    assert.equal((await reader.read(0x100000, 4)).length, 4)
    badSize = true
    await assert.rejects(reader.read(0x100000, 4), /reply size/)
  } finally { reader.close(); await stub.close() }
})

test('Citra RPC times out, recovers with a new ID and rejects work after close', async () => {
  let answer = false
  const stub = await server((packet, _peer, reply) => { if (answer) reply(replyFor(packet)) })
  const reader = new CitraRpcReader({ port: stub.port, timeoutMs: 50 })
  try {
    await assert.rejects(reader.read(0, 4), /timeout/)
    answer = true
    assert.equal((await reader.read(0, 4)).length, 4)
    reader.close()
    await assert.rejects(reader.read(0, 4), /closed/)
    reader.close()
  } finally { reader.close(); await stub.close() }
  assert.throws(() => new CitraRpcReader({ host: '192.168.1.1' }), /loopback/)
  const offline = new CitraRpcReader()
  try {
    await assert.rejects(offline.read(0xffffffff, 2), /range/)
    await assert.rejects(offline.read(0, 4097), /range/)
    const pending = offline.read(0, 4)
    offline.close()
    await assert.rejects(pending, /closed/)
  } finally { offline.close() }
})

test('X RAM member reconstructs discontiguous encrypted stats and rejects torn/invalid reads', async () => {
  const party = fixturePk6({ party: true, speciesId: 14, level: 9, hp: 10 })
  const calls: [number, number][] = []
  const reader = { async read(address: number, size: number) { calls.push([address, size]); return address === 1000 ? party.subarray(0, 232) : party.subarray(232, 254) } }
  const p = await readXMemoryMember(reader, 1000, 0)
  assert.equal(p.speciesId, 14)
  assert.equal(p.level, 9)
  assert.equal(p.currentHp, 10)
  assert.deepEqual(calls, [[1000, 232], [1344, 22], [1000, 232], [1344, 22]])
  let count = 0
  await assert.rejects(readXMemoryMember({ async read(address) {
    const data = Buffer.from(address === 1000 ? party.subarray(0, 232) : party.subarray(232, 254))
    if (++count === 4) data[0] ^= 1
    return data
  } }, 1000, 0), /changed/)
  await assert.rejects(readXMemoryMember({ read: async () => Buffer.alloc(1) }, 1000, 0), /Incomplete/)
  await assert.rejects(readXMemoryMember(reader, 1000, 6), /range/)
})

function partyMemoryFixture() {
  const profile = { firstMember: 1000, tableAddress: 900, countAddress: 924, stride: 484, statsOffset: 344 }
  const records = [14, 298, 661, 16, 263, 653].map(speciesId => fixturePk6({ party: true, speciesId }))
  // Logical order differs from pool order, and the deposited member leaves a hole.
  const metadata = Buffer.alloc(25)
  for (const [slot, pool] of [1, 0, 2, 3, 5, 4].entries()) metadata.writeUInt32LE(profile.firstMember - 64 + pool * 484, slot * 4)
  metadata[24] = 5
  const accessedPool: number[] = []
  const reader = { async read(address: number, size: number) {
    if (address === profile.tableAddress) return Buffer.from(metadata)
    const pool = Math.floor((address - (profile.firstMember - 64)) / 484)
    if (size === 12) {
      const pointers = Buffer.alloc(12)
      pointers.writeUInt32LE(profile.firstMember + pool * 484, 4)
      pointers.writeUInt32LE(profile.firstMember + pool * 484 + 344, 8)
      return pointers
    }
    accessedPool.push(pool)
    return size === 232 ? records[pool].subarray(0, 232) : records[pool].subarray(232, 254)
  } }
  return { profile, records, metadata, accessedPool, reader }
}

test('X RAM party follows logical pointers, skips a deposited hole and includes the sixth physical slot', async () => {
  const f = partyMemoryFixture()
  const party = await readXMemoryParty(f.reader, f.profile)
  assert.deepEqual(party.map(p => p.speciesId), [298, 14, 661, 16, 653])
  assert.deepEqual(party.map(p => p.slot), [0, 1, 2, 3, 4])
  assert.ok(!f.accessedPool.includes(4), 'must not read the deposited Pokémon')
  assert.ok(f.accessedPool.includes(5), 'fifth member resides in the sixth physical pool slot')
  for (const count of [0, 7]) {
    f.metadata[24] = count
    await assert.rejects(readXMemoryParty(f.reader, f.profile), /count/)
  }
})

test('X RAM party rejects count changes and pointer swaps between full passes', async () => {
  const f = partyMemoryFixture()
  let headers = 0
  let changeCount = true
  const reader = { async read(address: number, size: number) {
    const data = Buffer.from(await f.reader.read(address, size))
    if (address === f.profile.tableAddress) {
      headers++
      if (changeCount && headers === 2) data[24] = 4
      if (!changeCount && headers >= 3) {
        const first = data.readUInt32LE(0)
        data.writeUInt32LE(data.readUInt32LE(4), 0)
        data.writeUInt32LE(first, 4)
      }
    }
    return data
  } }
  await assert.rejects(readXMemoryParty(reader, f.profile), /count or order changed/)
  headers = 0
  changeCount = false
  await assert.rejects(readXMemoryParty(reader, f.profile), /party changed/)
})

test('X RAM party rejects duplicate/out-of-pool pointers and inconsistent object targets', async () => {
  const f = partyMemoryFixture()
  f.metadata.writeUInt32LE(f.metadata.readUInt32LE(0), 4)
  await assert.rejects(readXMemoryParty(f.reader, f.profile), /pointer table/)
  f.metadata.writeUInt32LE(0x01000000, 4)
  await assert.rejects(readXMemoryParty(f.reader, f.profile), /pointer table/)
  const g = partyMemoryFixture()
  await assert.rejects(readXMemoryParty({ async read(address, size) {
    const data = Buffer.from(await g.reader.read(address, size))
    if (size === 12) data.writeUInt32LE(0x01000000, 4)
    return data
  } }, g.profile), /object pointers/)
  const h = partyMemoryFixture()
  let objects = 0
  await assert.rejects(readXMemoryParty({ async read(address, size) {
    const data = Buffer.from(await h.reader.read(address, size))
    if (size === 12 && ++objects === 2) data[0] ^= 1
    return data
  } }, h.profile), /object changed/)
})
