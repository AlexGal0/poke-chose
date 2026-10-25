import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceCombatSession, emptyCombatSession } from '../src/domain/battle-lifecycle.ts'
import { normalizeBlackBattle } from '../src/games/black/battle-source.ts'
import { normalizeXBattle } from '../src/games/x/battle-source.ts'
import type { CombatParticipant } from '../src/models/combat.ts'
import { battleHasStarted, battleHasEnded, battleShortcutDestination } from '../src/domain/battle-shortcut.ts'
import { updateBattleHealthDisplay } from '../src/domain/battle-health-display.ts'

const enemy = { address: 'synthetic', speciesId: 513, form: 0, level: 7, personality: 1, trainerId: 2, currentHp: 20, maxHp: 25 }
const own = { ...enemy, speciesId: 507, personality: 3, slot: 1, battleSlot: 0 }
const black = () => normalizeBlackBattle({ status: 'ready', message: 'ready', candidates: [enemy, enemy], activeCandidates: [own, own], enemyVitalsCandidates: [enemy, enemy], updatedAt: null, battleActive: true })
const x = () => normalizeXBattle({ active: true,
  enemy: { identity: '513:1:2', speciesId: 513, form: 0, level: 7, currentHp: 20, maxHp: 25, partySlot: null },
  own: { identity: '507:3:2', speciesId: 507, form: 0, level: 7, currentHp: 20, maxHp: 25, partySlot: 1 },
}, 'ready', [])

test('both source adapters share the same battle session through long replacement and read gaps', () => {
  for (const initial of [black(), x()]) {
    let session = advanceCombatSession(emptyCombatSession<CombatParticipant, CombatParticipant[]>(), initial)
    assert.equal(battleHasStarted(false, { status: initial.status, inBattle: session.inBattle }), true)
    for (let i = 0; i < 50; i++) {
      const gap = i % 2 ? normalizeXBattle(null, 'ready', []) : normalizeBlackBattle({ status: 'ready', message: 'ready', updatedAt: null, candidates: [], battleActive: null })
      session = advanceCombatSession(session, gap)
      assert.equal(session.inBattle, true)
      assert.equal(session.own?.identity, initial.own?.identity)
      assert.equal(session.enemy?.identity, initial.enemy?.identity)
      assert.equal(battleHasEnded(true, { status: gap.status, inBattle: session.inBattle }), false)
      assert.equal(battleHasStarted(true, { status: gap.status, inBattle: session.inBattle }), false)
    }
    const interrupted = advanceCombatSession(session, { ...initial, status: 'error', active: false })
    assert.equal(interrupted, session)
    const ended = advanceCombatSession(session, { ...initial, active: false })
    assert.deepEqual(ended, emptyCombatSession())
    assert.equal(battleHasEnded(true, { status: 'ready', inBattle: ended.inBattle }), true)
  }
})

test('source normalization preserves health and identity while the shared session replaces only confirmed participants', () => {
  for (const initial of [black(), x()]) {
    const previous = advanceCombatSession(emptyCombatSession<CombatParticipant, CombatParticipant[]>(), initial)
    const replacement = { ...initial.own!, identity: '406:7:8', speciesId: 406, health: { currentHp: 37, maxHp: 39 }, stages: null }
    const next = advanceCombatSession(previous, { ...initial, enemy: null, own: replacement, active: null })
    assert.equal(next.enemy, previous.enemy)
    assert.equal(next.own, replacement)
    const display = updateBattleHealthDisplay({ identity: initial.own!.identity, health: initial.own!.health, hit: 3, damageFraction: 0.5 }, replacement.identity, replacement.health)
    assert.equal(display.hit, 0)
    assert.deepEqual(display.health, replacement.health)
  }
})

test('battle shortcut destinations preserve return view, with the same fallback for every adapter', () => {
  for (const tab of ['captures', 'collection', 'catalog', 'analysis', 'types'] as const) {
    assert.equal(battleShortcutDestination(tab, null), 'battle')
    assert.equal(battleShortcutDestination('battle', tab), tab)
  }
  assert.equal(battleShortcutDestination('battle', null), 'captures')
})
