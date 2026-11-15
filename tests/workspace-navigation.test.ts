import test from 'node:test'
import assert from 'node:assert/strict'
import { promotedToolCount } from '../src/components/workspace-navigation.ts'

test('tools reappear one at a time as the navigation gains space', () => {
  assert.equal(promotedToolCount(320, 4, 5), 0)
  for (let count = 1; count <= 5; count++) {
    const threshold = 4 * 140 + 148 + count * 140
    assert.equal(promotedToolCount(threshold - 1, 4, 5), count - 1)
    assert.equal(promotedToolCount(threshold, 4, 5), count)
  }
  assert.equal(promotedToolCount(4000, 4, 5), 5)
})

test('navigation adapts to supported destinations without inventing a battle tool', () => {
  assert.equal(promotedToolCount(4000, 4, 4), 4)
  assert.equal(promotedToolCount(4000, 3, 0), 0)
  assert.equal(promotedToolCount(708, 3, 2), 1)
  assert.equal(promotedToolCount(0, 4, 5), 0)
  assert.equal(promotedToolCount(Number.NaN, 4, 5), 0)
})
