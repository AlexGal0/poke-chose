import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { GdbReader, packet } from '../gdb.mjs'
import { locateCandidates, locatePartyLayouts, readParty } from '../party.mjs'
import { pk5Fixture, saveFixture } from '../../../tests/helpers/save-fixture.ts'

async function mockServer(t, respond) {
  const commands = []
  const sockets = new Set()
  let initialAck = false
  const server = createServer(socket => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    let buffer = ''
    socket.on('data', data => {
      buffer += data.toString('latin1')
      if (!initialAck && buffer[0] === '+') { initialAck = true; socket.write('+') }
      while (buffer.length) {
        if (buffer[0] !== '$') { buffer = buffer.slice(1); continue }
        const end = buffer.indexOf('#')
        if (end < 0 || buffer.length < end + 3) return
        const command = buffer.slice(1, end)
        assert.equal(buffer.slice(0, end + 3), packet(command))
        buffer = buffer.slice(end + 3)
        commands.push(command)
        socket.write('+')
        if (command === 'c') continue
        if (command === 'D') { socket.write(packet('OK')); continue }
        if (command === 'qSupported:') socket.write(packet('PacketSize=400'))
        else respond(command, socket)
      }
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => {
    for (const socket of sockets) socket.destroy()
    await new Promise(resolve => server.close(resolve))
  })
  return { port: server.address().port, commands, acknowledged: () => initialAck }
}

test('GDB handshake resumes melonDS and reads fragmented packets in bounded chunks', async t => {
  const mock = await mockServer(t, (command, socket) => {
    const [, address, length] = /^m([\da-f]+),([\da-f]+)$/.exec(command)
    const bytes = Buffer.alloc(parseInt(length, 16), parseInt(address, 16) & 255)
    const response = packet(bytes.toString('hex'))
    socket.write(response.slice(0, 3))
    setImmediate(() => socket.write(response.slice(3)))
  })
  const reader = new GdbReader({ port: mock.port, chunkSize: 16 })
  t.after(() => reader.close())
  assert.equal(await reader.connect(), 'PacketSize=400')
  const bytes = await reader.readMemory(0x02000000, 33)
  assert.equal(mock.acknowledged(), true)
  assert.deepEqual(mock.commands, ['qSupported:', 'c', 'm2000000,10', 'm2000010,10', 'm2000020,1'])
  assert.deepEqual(bytes, Buffer.concat([Buffer.alloc(16), Buffer.alloc(16, 16), Buffer.from([32])]))
  await assert.rejects(reader.readMemory(0x01000000, 4), /fuera de la RAM/)
})

test('GDB expands run-length encoded replies', async t => {
  const mock = await mockServer(t, (_command, socket) => socket.write(packet('0* ')))
  const reader = new GdbReader({ port: mock.port })
  t.after(() => reader.close())
  await reader.connect()
  assert.deepEqual(await reader.readMemory(0x02000000, 2), Buffer.alloc(2))
})

test('normal shutdown detaches explicitly before closing the transport', async t => {
  const mock = await mockServer(t, (_command, socket) => socket.write(packet('0000')))
  const reader = new GdbReader({ port: mock.port })
  t.after(() => reader.close())
  await reader.connect()
  await reader.readMemory(0x02000000, 2)
  await reader.disconnect()
  assert.equal(mock.commands.at(-1), 'D')
  const second = new GdbReader({ port: mock.port })
  t.after(() => second.close())
  await second.connect()
  assert.deepEqual(await second.readMemory(0x02000000, 2), Buffer.alloc(2))
  await second.disconnect()
})

test('GDB rejects malformed memory, errors, stops and timeouts', async t => {
  for (const [payload, message] of [['abc', /incompleta/], ['E01', /rechazó/], ['T05', /parada/], [null, /a tiempo/]]) {
    const mock = await mockServer(t, (_command, socket) => { if (payload !== null) socket.write(packet(payload)) })
    const reader = new GdbReader({ port: mock.port, timeoutMs: 150 })
    t.after(() => reader.close())
    await reader.connect()
    await assert.rejects(reader.readMemory(0x02000000, 2), message)
    reader.close()
  }
})

test('a corrupt checksum requires retransmission instead of accepting data', async t => {
  const mock = await mockServer(t, (_command, socket) => {
    socket.write('$0000#ff')
    socket.once('data', bytes => { assert.ok(bytes.toString().includes('-')); socket.write(packet('0000')) })
  })
  const reader = new GdbReader({ port: mock.port })
  t.after(() => reader.close())
  await reader.connect()
  assert.deepEqual(await reader.readMemory(0x02000000, 2), Buffer.alloc(2))
})

test('candidate search validates Pokémon identity and ignores corrupt lookalikes', () => {
  const pokemon = pk5Fixture(551, 20)
  const ram = Buffer.alloc(2048)
  pokemon.copy(ram, 128)
  pokemon.copy(ram, 512)
  ram[512 + 8] ^= 1
  assert.deepEqual(locateCandidates(ram, 0x02000000, saveFixture([pokemon])), [{ address: '0x2000080', referenceSlot: 0, speciesId: 551, level: 20 }])
})

test('party reader validates stable samples and detects unsaved changes using simulated RAM', async () => {
  let member = pk5Fixture(551, 20)
  const config = { partyAddress: '0x02000100', partyCountAddress: '0x02000000', partyStride: 220 }
  const reader = { readMemory: async address => address === 0x02000000 ? Buffer.from([1, 0, 0, 0]) : Buffer.from(member) }
  assert.equal((await readParty(reader, config))[0].level, 20)
  member = pk5Fixture(551, 21)
  assert.equal((await readParty(reader, config))[0].level, 21)
  let reads = 0
  reader.readMemory = async address => address === 0x02000000 ? Buffer.from([1, 0, 0, 0]) : pk5Fixture(551, ++reads === 1 ? 20 : 21)
  await assert.rejects(readParty(reader, config), /cambió durante/)
  await assert.rejects(readParty(reader, { ...config, partyAddress: null }), /Configura/)
})

test('party layout hypothesis requires a valid header and every reference member', () => {
  const first = pk5Fixture(551, 20)
  const second = pk5Fixture(502, 25, 10)
  const save = saveFixture([first, second])
  const ram = Buffer.alloc(2048)
  ram.writeUInt32LE(6, 120)
  ram.writeUInt32LE(2, 124)
  first.copy(ram, 128)
  second.copy(ram, 348)
  const [layout] = locatePartyLayouts(ram, 0x02000000, save)
  assert.equal(layout.partyAddress, '0x2000080')
  assert.equal(layout.partyCountAddress, '0x200007c')
  assert.equal(layout.confirmedLive, false)
  assert.deepEqual(layout.party.map(member => member.speciesId), [551, 502])
  ram.writeUInt32LE(1, 124)
  assert.deepEqual(locatePartyLayouts(ram, 0x02000000, save), [])
  ram.writeUInt32LE(2, 124)
  ram[356] ^= 1
  assert.deepEqual(locatePartyLayouts(ram, 0x02000000, save), [])
})
