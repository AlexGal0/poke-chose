import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LivePartyController } from '../bridge/citra/live-party-controller.ts'
import { createLivePartySource } from '../src/sources/live-party-source.ts'
import { isLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'
import { normalizeXFieldBattle } from '../src/games/x/battle-source.ts'
import { readXMemoryBattleField } from '../src/games/x/memory-battle-field.ts'
import { xBattleFieldFixture } from './helpers/x-battle-field-fixture.ts'
import { advanceFieldCombatSession, emptyFieldCombatSession } from '../src/domain/field-combat-session.ts'
import type { BattleReading } from '../src/models/battle.ts'

async function until(predicate: () => boolean) {
  for (let i = 0; i < 200 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 5))
  assert.ok(predicate(), 'pipeline reached the expected state')
}

test('serialized bridge snapshots preserve the multi-battle session through gaps, errors, replacement and exit', async () => {
  const fixture = xBattleFieldFixture('double')
  let battle: BattleReading | null = await readXMemoryBattleField(fixture.reader, fixture.party)
  let fail = false, emissions = 0
  const events = { onmessage: null as ((event: { data: string }) => void) | null, onerror: null as (() => void) | null, close() {} }
  const source = createLivePartySource(() => events)
  let session = emptyFieldCombatSession()
  const unsubscribe = source.subscribe(snapshot => {
    emissions++
    session = advanceFieldCombatSession(session, normalizeXFieldBattle(snapshot.battle, snapshot.status, []))
  })
  const controller = new LivePartyController(snapshot => {
    assert.ok(isLivePartySnapshot(snapshot), 'every bridge snapshot must satisfy the client protocol')
    events.onmessage?.({ data: JSON.stringify(snapshot) })
  }, () => ({ close() {}, async read() {
    if (fail) throw new Error('synthetic transport failure')
    return { party: fixture.party, pokedex: { seenSpeciesIds: [372, 619], caughtSpeciesIds: [] }, battle }
  } }), 10)
  try {
    controller.connect()
    await until(() => session.field?.sides[0].positions.length === 2)
    const original = structuredClone(session.field)
    battle = null
    await until(() => controller.snapshot.battle === null && session.stale)
    assert.deepEqual(session.field, original)
    fail = true
    await until(() => controller.snapshot.status === 'error')
    assert.deepEqual(session.field, original)
    const beforeInvalid = emissions
    events.onmessage?.({ data: JSON.stringify({ ...controller.snapshot, battle: { active: true, own: null, enemy: null, field: {} } }) })
    assert.equal(emissions, beforeInvalid, 'invalid field payload cannot replace a valid session')
    const switched = xBattleFieldFixture('double', [2, 3, 0, 1, 4, 5], [2, 0, 1])
    battle = await readXMemoryBattleField(switched.reader, switched.party)
    fail = false
    await until(() => {
      const position = session.field?.sides[0].positions[0]
      return position?.state === 'occupied' && position.pokemon.partySlot === 2 && !session.stale
    })
    const rival = session.field?.sides[1].positions[0]
    assert.equal(rival?.state === 'occupied' ? rival.pokemon.partySlot : null, 2)
    battle = { active: false, own: null, enemy: null }
    await until(() => session.inBattle === false)
    assert.equal(session.field, null)
    const next = xBattleFieldFixture('horde')
    battle = await readXMemoryBattleField(next.reader, next.party)
    await until(() => session.field?.sides[1].positions.length === 5)
    assert.equal(session.revision, 2)
  } finally { controller.disconnect(); unsubscribe() }
})
