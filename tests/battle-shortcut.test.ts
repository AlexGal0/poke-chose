import test from 'node:test'
import assert from 'node:assert/strict'
import { battleShortcutDestination, battleHasEnded } from '../src/domain/battle-shortcut.ts'

test('battle shortcut opens battle and returns to the original section on its second activation', () => {
  for (const tab of ['captures', 'collection', 'catalog', 'analysis', 'types'] as const) {
    assert.equal(battleShortcutDestination(tab, null), 'battle')
    assert.equal(battleShortcutDestination('battle', tab), tab)
  }
})

test('battle shortcut sends manual or restored battle navigation to zone captures', () => {
  assert.equal(battleShortcutDestination('battle', null), 'captures')
  assert.equal(battleShortcutDestination('collection', 'types'), 'battle')
})

test('automatic return requires a confirmed battle followed by a healthy reading without battle', () => {
  assert.equal(battleHasEnded(true, { status: 'ready', inBattle: false }), true)
  assert.equal(battleHasEnded(false, { status: 'ready', inBattle: false }), false)
  assert.equal(battleHasEnded(true, { status: 'ready', inBattle: true }), false)
  for (const status of ['waiting', 'error']) {
    assert.equal(battleHasEnded(true, { status, inBattle: false }), false)
  }
})
