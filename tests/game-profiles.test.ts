import test from 'node:test'
import assert from 'node:assert/strict'
import { GAME_PROFILES, pendingGameModules } from '../src/games/profiles.ts'

test('repel remains supported in Black and is unplanned for X and Y', () => {
  for (const game of GAME_PROFILES) {
    assert.equal(game.modules.repel, game.id === 'black')
    assert.equal(game.unplannedModules?.includes('repel') ?? false, game.id !== 'black')
    assert.ok(!pendingGameModules(game).includes('repel'))
  }
})

test('pending modules distinguish planned work from unsupported features', () => {
  const game = GAME_PROFILES.find(game => game.id === 'y')!
  assert.deepEqual(pendingGameModules({ ...game, modules: { ...game.modules, daycare: false } }), ['daycare'])
})
