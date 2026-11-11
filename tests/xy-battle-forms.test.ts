import test from 'node:test'
import assert from 'node:assert/strict'
import { xyBattleFormMatches } from '../src/games/xy/battle-forms.ts'
import { readXMemoryBattleField } from '../src/games/x/memory-battle-field.ts'
import { xBattleFieldFixture } from './helpers/x-battle-field-fixture.ts'
import { fixturePk6 } from './helpers/x-roster-fixture.ts'
import { readPartyPk6 } from '../src/games/x/pk6.ts'
import { X_MEMORY_PARTY_CANDIDATE } from '../src/games/x/memory-party.ts'

test('XY mega forms match their normal roster only with the corresponding held stone', () => {
  const base = { speciesId: 448, form: 0, heldItemId: 673 }
  assert.equal(xyBattleFormMatches(base, { ...base, form: 1 }), true)
  assert.equal(xyBattleFormMatches(base, { ...base, form: 2 }), false)
  assert.equal(xyBattleFormMatches({ ...base, heldItemId: 17 }, { ...base, form: 1 }), false)
  assert.equal(xyBattleFormMatches(base, { ...base, speciesId: 310, form: 1 }), false)
  assert.equal(xyBattleFormMatches({ speciesId: 6, form: 0, heldItemId: 660 }, { speciesId: 6, form: 2, heldItemId: 660 }), false)
  assert.equal(xyBattleFormMatches({ speciesId: 6, form: 0, heldItemId: 678 }, { speciesId: 6, form: 2, heldItemId: 678 }), true)
  assert.equal(xyBattleFormMatches({ speciesId: 351, form: 0 }, { speciesId: 351, form: 1 }), false)
})

test('field recognizes Mega Lucario with normal-party identity and keeps copy and stone validation', async () => {
  const f = xBattleFieldFixture('single')
  const normal = fixturePk6({ party: true, speciesId: 448, personality: 1, level: 57, heldItemId: 673 })
  f.party[0] = readPartyPk6(normal, 0)
  const active = fixturePk6({ party: true, speciesId: 448, personality: 1, level: 57, heldItemId: 673, form: 1 })
  const core = X_MEMORY_PARTY_CANDIDATE.firstMember
  f.put(core, active.subarray(0, 232)); f.put(core + 344, active.subarray(232, 254))
  for (const copy of [0, 1]) { const species = Buffer.alloc(2); species.writeUInt16LE(448); f.put(f.pointers[0][copy][0] + 12, species) }
  const result = await readXMemoryBattleField(f.reader, f.party)
  assert.equal(result.own?.form, 1)
  assert.equal(result.own?.partySlot, 0)
  assert.equal(result.own?.speciesId, 448)
  f.party[0] = { ...f.party[0], heldItemId: 17 }
  assert.equal((await readXMemoryBattleField(f.reader, f.party)).own, null)
})
