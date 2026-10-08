// Original synthetic fixtures. No player data, copyrighted binaries or PKHeX code.
// Test encoder deliberately uses BigInt arithmetic and a literal permutation table.
const permutations = 'ABCD ABDC ACBD ACDB ADBC ADCB BACD BADC BCAD BCDA BDAC BDCA CABD CADB CBAD CBDA CDAB CDBA DABC DACB DBAC DBCA DCAB DCBA'.split(' ')

export function pk5Fixture(species = 502, level = 25, shuffle = 9, name?: { text: string; nicknamed?: boolean; terminator?: number }, vitals = { currentHp: 60, maxHp: 80, experience: 15625 }, individual = { natureId: 0, attack: 51, defense: 52, speed: 53, specialAttack: 54, specialDefense: 55 }): Buffer {
  const data = Buffer.alloc(220)
  const pid = (0xa000001f | (shuffle << 13)) >>> 0
  data.writeUInt32LE(pid)
  data.writeUInt16LE(species, 8)
  data.writeUInt16LE(234, 0x0a)
  data.writeUInt32LE(12345, 0x0c)
  data[0x15] = 65
  ;[33, 45, 55, 0].forEach((id, index) => data.writeUInt16LE(id, 0x28 + index * 2))
  data[0x8c] = level
  data.writeUInt32LE(vitals.experience, 0x10)
  data.writeUInt16LE(vitals.currentHp, 0x8e)
  data.writeUInt16LE(vitals.maxHp, 0x90)
  data[0x41] = individual.natureId
  ;[individual.attack, individual.defense, individual.speed, individual.specialAttack, individual.specialDefense].forEach((value, index) => data.writeUInt16LE(value, 0x92 + index * 2))
  if (name) {
    if (name.nicknamed !== false) data.writeUInt32LE(0x80000000, 0x38)
    const text = name.text.slice(0, 10)
    for (let index = 0; index < text.length; index++) data.writeUInt16LE(text.charCodeAt(index), 0x48 + index * 2)
    data.writeUInt16LE(name.terminator ?? 0xffff, 0x48 + text.length * 2)
    if (text.length < 9) data.writeUInt16LE(88, 0x4a + text.length * 2) // trash after terminator
  }
  let sum = 0
  for (let i = 8; i < 136; i += 2) sum += data.readUInt16LE(i)
  data.writeUInt16LE(sum & 0xffff, 6)
  const canonical = Buffer.from(data)
  for (let index = 0; index < 4; index++) {
    const block = permutations[shuffle % 24].charCodeAt(index) - 65
    canonical.copy(data, 8 + index * 32, 8 + block * 32, 40 + block * 32)
  }
  const crypt = (start: number, end: number, initial: number) => {
    let seed = BigInt(initial)
    for (let offset = start; offset < end; offset += 2) {
      seed = (seed * 0x41c64e6dn + 0x6073n) & 0xffffffffn
      data.writeUInt16LE(data.readUInt16LE(offset) ^ Number(seed >> 16n), offset)
    }
  }
  crypt(8, 136, sum & 0xffff)
  crypt(136, 220, pid)
  return data
}

// Independent bit-at-a-time reference CRC.
function referenceCrc(bytes: Buffer) {
  let register = 65535
  for (const byte of bytes) {
    for (let bit = 7; bit >= 0; bit--) {
      const feedback = ((register >>> 15) ^ (byte >>> bit)) & 1
      register = ((register << 1) & 65535) ^ (feedback ? 4129 : 0)
    }
  }
  return register
}

export function refreshFixtureChecksums(save: Buffer, base = 0) {
  for (let box = 0; box < 24; box++) {
    const start = base + 0x400 + box * 0x1000
    const value = referenceCrc(save.subarray(start, start + 0xff0))
    save.writeUInt16LE(value, start + 0xff2)
    save.writeUInt16LE(value, base + 0x23f02 + box * 2)
  }
  for (const [offset, length, checksum, mirror] of [[0x18e00, 0x534, 0x19336, 0x23f34], [0x19400, 0x68, 0x1946a, 0x23f36], [0x19500, 0x9c, 0x1959e, 0x23f38], [0x21600, 0x4d4, 0x21ad6, 0x23f6e]]) {
    const value = referenceCrc(save.subarray(base + offset, base + offset + length))
    save.writeUInt16LE(value, base + checksum)
    save.writeUInt16LE(value, base + mirror)
  }
  save.writeUInt16LE(referenceCrc(save.subarray(base + 0x23f00, base + 0x23f8c)), base + 0x23f9a)
}

export function saveFixture(members: Buffer[] = [pk5Fixture()], backupMembers?: Buffer[]): Buffer {
  const save = Buffer.alloc(0x80000, 0xff)
  const entry = (base: number, party: Buffer[]) => {
    save.fill(0, base, base + 0x24000)
    save[base + 0x1941f] = 21
    save[base + 0x18e04] = party.length
    party.forEach((pokemon, slot) => pokemon.copy(save, base + 0x18e08 + slot * 220))
    refreshFixtureChecksums(save, base)
  }
  entry(0, members)
  if (backupMembers) entry(0x24000, backupMembers)
  return save
}
