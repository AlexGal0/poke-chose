import test from 'node:test'
import assert from 'node:assert/strict'
import { xyPartnerFieldFixture } from './helpers/xy-partner-field-fixture.ts'
import { readXMemoryBattleField, XY_PARTNER_FIELD_TABLES } from '../src/games/x/memory-battle-field.ts'
import { readXMemoryBattleFormat, XY_PARTNER_BATTLE_HANDLER } from '../src/games/x/memory-battle-format.ts'
import { isBattleReading } from '../src/models/battle.ts'
import { validCombatField } from '../src/domain/combat-field.ts'
import { normalizeYFieldBattle } from '../src/games/y/battle-source.ts'
import { advanceFieldCombatSession, emptyFieldCombatSession } from '../src/domain/field-combat-session.ts'

test('XY story-partner dispatcher declares double layout with separate owner parties', async () => {
  const f = xyPartnerFieldFixture()
  assert.deepEqual(await readXMemoryBattleFormat(f.reader), { format: 'double', positions: [2, 2], layout: 'partner' })
  const reading = await readXMemoryBattleField(f.reader, f.party)
  assert.ok(isBattleReading(reading, 721))
  assert.ok(validCombatField(reading.field!))
  const [own, enemy] = reading.field!.sides
  assert.deepEqual(own.owners, [{ id: 'player', control: 'player' }, { id: 'ally', control: 'ally' }])
  assert.deepEqual(enemy.owners.map(owner => owner.id), ['opponent', 'opponent-2'])
  assert.deepEqual(own.rosterTotal, { state: 'known', value: 9 })
  assert.deepEqual(enemy.rosterTotal, { state: 'known', value: 5 })
  assert.equal(own.positions[1].state === 'occupied' && own.positions[1].pokemon.speciesId, 678)
  assert.equal(own.positions[1].state === 'occupied' && own.positions[1].pokemon.partySlot, null)
  assert.equal(enemy.positions[1].state === 'occupied' && enemy.positions[1].pokemon.speciesId, 510)
  const invalid = structuredClone(reading)
  invalid.field!.sides[0].rosterTotal = { state: 'known', value: 13 }
  assert.equal(isBattleReading(invalid, 721), false)
})

test('partner replacement uses its own battle order and never publishes reserves as player Pokémon', async () => {
  const f = xyPartnerFieldFixture(1)
  const reading = await readXMemoryBattleField(f.reader, f.party)
  const ally = reading.field!.sides[0].positions[1]
  assert.equal(ally.state === 'occupied' && ally.pokemon.speciesId, 359)
  assert.equal(ally.state === 'occupied' && ally.pokemon.ownerId, 'ally')
  const session = advanceFieldCombatSession(emptyFieldCombatSession(), normalizeYFieldBattle(reading, 'ready', []))
  assert.equal(session.field?.sides[0].positions.length, 2)
  assert.equal(session.playerTeam, null)
})

test('partner code or counts that disagree are rejected; corrupt active identities remain unknown', async () => {
  const f = xyPartnerFieldFixture()
  f.word(XY_PARTNER_BATTLE_HANDLER.instructions[0][0], 0)
  await assert.rejects(readXMemoryBattleFormat(f.reader), /instructions disagree/)
  const g = xyPartnerFieldFixture()
  g.word(XY_PARTNER_FIELD_TABLES[2].copies[1] + 24, 2)
  await assert.rejects(readXMemoryBattleField(g.reader, g.party), /counts disagree/)
  const h = xyPartnerFieldFixture()
  h.word(h.extraPointers[0][1], 0)
  const reading = await readXMemoryBattleField(h.reader, h.party)
  assert.equal(reading.field!.sides[0].positions[1].state, 'unknown')
  assert.ok(isBattleReading(reading, 721))
})
