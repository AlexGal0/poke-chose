import { test } from 'node:test'
import assert from 'node:assert/strict'
import { xBattleFieldFixture } from './helpers/x-battle-field-fixture.ts'
import { readXMemoryBattleField, X_BATTLE_FIELD_TABLES } from '../src/games/x/memory-battle-field.ts'
import { X_BATTLE_STATE_ADDRESS, X_BATTLE_STAGES_OFFSET } from '../src/games/x/memory-battle.ts'
import { X_BATTLE_FORMAT_SELECTOR } from '../src/games/x/memory-battle-format.ts'
import { isBattleReading } from '../src/models/battle.ts'
import { normalizeXFieldBattle } from '../src/games/x/battle-source.ts'
import { advanceFieldCombatSession, emptyFieldCombatSession } from '../src/domain/field-combat-session.ts'
import { xSavedPokemon } from '../src/games/x/saved-roster.ts'
import type { SavedRosterPokemon } from '../src/games/core/saved-roster.ts'

test('X reads configured positions for all three formats without counting reserves or live Pokémon', async () => {
  for (const format of ['single', 'double', 'horde'] as const) {
    const f = xBattleFieldFixture(format)
    const result = await readXMemoryBattleField(f.reader, f.party)
    assert.equal(isBattleReading(result, 721), true)
    assert.equal(result.field?.sides[0].positions.length, format === 'double' ? 2 : 1)
    assert.equal(result.field?.sides[1].positions.length, format === 'horde' ? 5 : format === 'double' ? 2 : 1)
    assert.deepEqual(result.field?.format, { state: 'known', value: { kind: 'general', id: format } })
    assert.equal(result.field?.sides[1].positions.every(position => position.state === 'occupied'), true)
  }
})

test('PK6 links distinguish equal species and HP and preserve original slots after both switches', async () => {
  const f = xBattleFieldFixture('double', [2, 3, 0, 1, 4, 5], [2, 0, 1])
  const result = await readXMemoryBattleField(f.reader, f.party)
  const slots = result.field!.sides.map(side => side.positions.map(position => position.state === 'occupied' ? position.pokemon.partySlot : null))
  assert.deepEqual(slots, [[2, 3], [2, 0]])
  assert.equal(result.opponentRosterTotal, 3)
  assert.notEqual(result.field!.sides[1].positions[0], result.field!.sides[1].positions[1])
})

test('horde keeps all five distinct identities and zero HP after a KO', async () => {
  const f = xBattleFieldFixture('horde')
  for (const copy of [0, 1]) { const bytes = Buffer.alloc(2); f.put(f.pointers[1][copy][3] + 16, bytes) }
  const result = await readXMemoryBattleField(f.reader, f.party)
  const positions = result.field!.sides[1].positions
  assert.equal(positions.length, 5)
  assert.equal(positions[3].state === 'occupied' && positions[3].pokemon.health?.currentHp, 0)
  assert.equal(new Set(positions.map(position => position.state === 'occupied' && position.pokemon.identity)).size, 5)
})

test('invalid links or mismatched vitals remain unknown, while mismatched stages alone keep identity and health', async () => {
  const f = xBattleFieldFixture()
  f.word(f.pointers[1][0][0], 0)
  f.put(f.pointers[1][0][1] + X_BATTLE_STAGES_OFFSET, Buffer.from([8, 6, 6, 6, 6, 6, 6]))
  const result = await readXMemoryBattleField(f.reader, f.party)
  assert.equal(result.field!.sides[1].positions[0].state, 'unknown')
  const second = result.field!.sides[1].positions[1]
  assert.equal(second.state === 'occupied' ? second.pokemon.stages : 'missing', null)
  assert.equal(second.state === 'occupied' ? second.pokemon.health?.currentHp : null, 22)
  assert.equal(isBattleReading(result, 721), true)
})

test('unknown format never becomes single and stale selectors outside battle cannot keep a session alive', async () => {
  const f = xBattleFieldFixture()
  f.word(X_BATTLE_FORMAT_SELECTOR, 0)
  const unknown = await readXMemoryBattleField(f.reader, f.party)
  assert.deepEqual(unknown.field?.format, { state: 'unknown' })
  assert.equal(unknown.enemy, null)
  assert.equal(isBattleReading(unknown, 721), true)
  f.word(X_BATTLE_STATE_ADDRESS, 0x40000)
  for (const address of X_BATTLE_FIELD_TABLES.flat()) f.word(address, 0)
  assert.deepEqual(await readXMemoryBattleField(f.reader, f.party), { active: false, own: null, enemy: null })
})

test('truncation and table transitions reject a field snapshot', async () => {
  const f = xBattleFieldFixture()
  await assert.rejects(readXMemoryBattleField({ async read(address, length) { return address === X_BATTLE_FIELD_TABLES[0][0] && length === 28 ? Buffer.alloc(2) : f.reader.read(address, length) } }, f.party))
  let reads = 0
  await assert.rejects(readXMemoryBattleField({ async read(address, length) { if (address === X_BATTLE_FORMAT_SELECTOR && ++reads >= 3) return Buffer.alloc(4); return f.reader.read(address, length) } }, f.party))
})

test('field payload rejects malformed topology, health and species without widening legacy validation', async () => {
  const f = xBattleFieldFixture(), result = await readXMemoryBattleField(f.reader, f.party)
  const invalid = structuredClone(result)
  const position = invalid.field!.sides[1].positions[0]
  if (position.state === 'occupied') position.pokemon.health!.currentHp = 99
  assert.equal(isBattleReading(invalid, 721), false)
  assert.equal(isBattleReading({ ...result, field: {} }, 721), false)
  assert.equal(isBattleReading({ active: true, own: null, enemy: null }, 721), false)
  for (const change of [{ speciesId: 700 }, { form: 99 }, { ownerId: 'missing' }, { stages: { attack: 99 } }]) {
    const changed = structuredClone(result)
    const first = changed.field!.sides[1].positions[0]
    if (first.state === 'occupied') Object.assign(first.pokemon, change)
    assert.equal(isBattleReading(changed, 649), false)
    if ('speciesId' in change) assert.equal(isBattleReading(changed, 721), true)
  }
})

test('normalized X field drives the session and confirmed exit clears it', async () => {
  const f = xBattleFieldFixture(), result = await readXMemoryBattleField(f.reader, f.party)
  const observation = normalizeXFieldBattle(result, 'ready', [])
  let session = advanceFieldCombatSession(emptyFieldCombatSession(), observation)
  assert.equal(session.field?.sides[0].positions.length, 2)
  session = advanceFieldCombatSession(session, normalizeXFieldBattle(null, 'ready', []))
  assert.equal(session.field?.sides[1].positions.length, 2)
  assert.equal(session.stale, true)
  session = advanceFieldCombatSession(session, normalizeXFieldBattle({ active: false, own: null, enemy: null }, 'ready', []))
  assert.equal(session.field, null)
})

test('X normalization links nicknames and reserves by identity after slot changes and keeps both actives in sync', async () => {
  const f = xBattleFieldFixture('double', [2, 3, 0, 1, 4, 5]), result = await readXMemoryBattleField(f.reader, f.party)
  const roster: SavedRosterPokemon[] = await Promise.all(f.party.map(async member => ({ ...await xSavedPokemon(member), ...member, level: member.level, instanceKey: `slot-${member.slot}`, location: 'party', box: null, partyMember: member, nickname: `Nombre${member.slot}` })))
  const observation = normalizeXFieldBattle(result, 'ready', roster)
  const session = advanceFieldCombatSession(emptyFieldCombatSession(), observation)
  const own = session.field!.sides[0].positions
  assert.equal(own[0].state === 'occupied' && own[0].pokemon.nickname, 'Nombre2')
  assert.equal(own[1].state === 'occupied' && own[1].pokemon.nickname, 'Nombre3')
  assert.equal(session.playerTeam?.length, 6)
  assert.equal(session.playerTeam?.find(member => member.partySlot === 2)?.health?.currentHp, 15)
  assert.equal(normalizeXFieldBattle(result, 'error', roster).activity, 'unknown')
})

test('duplicate field pointers and missing controlled ownership never publish invented participants', async () => {
  const f = xBattleFieldFixture('double')
  const withoutSecond = await readXMemoryBattleField(f.reader, f.party.filter(member => member.slot !== 1))
  assert.equal(withoutSecond.field?.sides[0].positions[1].state, 'unknown')
  for (const copy of [0, 1]) f.word(X_BATTLE_FIELD_TABLES[1][copy] + 4, f.pointers[1][copy][0])
  await assert.rejects(readXMemoryBattleField(f.reader, f.party), /Duplicate X field identities/)
})

test('disagreeing vital copies stay partial and a change between complete passes rejects publication', async () => {
  const f = xBattleFieldFixture('double')
  const hp = Buffer.alloc(2); hp.writeUInt16LE(3)
  f.put(f.pointers[1][1][0] + 16, hp)
  const result = await readXMemoryBattleField(f.reader, f.party)
  assert.equal(result.field?.sides[1].positions[0].state, 'unknown')
  const g = xBattleFieldFixture('double')
  let tableHeaders = 0
  await assert.rejects(readXMemoryBattleField({ async read(address, length) {
    if (address === X_BATTLE_FIELD_TABLES[0][0] && length === 28 && ++tableHeaders === 3) {
      for (const copy of [0, 1]) g.put(g.pointers[1][copy][0] + 16, hp)
    }
    return g.reader.read(address, length)
  } }, g.party), /changed between passes/)
})
