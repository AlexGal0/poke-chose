import test from 'node:test'
import assert from 'node:assert/strict'
import { adjacentBox, matchesBoxSearch } from '../src/domain/box-navigation.ts'

test('box navigation respects adapter counts, endpoints and non-box locations', () => {
  for (const count of [24, 31]) {
    assert.equal(adjacentBox('all', 1, count), 0)
    assert.equal(adjacentBox('party', -1, count), count - 1)
    assert.equal(adjacentBox(0, -1, count), null)
    assert.equal(adjacentBox(count - 1, 1, count), null)
    assert.equal(adjacentBox(10, 1, count), 11)
    assert.equal(adjacentBox(10, -1, count), 9)
  }
  assert.equal(adjacentBox('all', 1, 0), null)
})

test('box selector search filters numbers and localized labels without using occupancy counts', () => {
  assert.equal(matchesBoxSearch(11, 'Caja 12', ' 12 '), true)
  assert.equal(matchesBoxSearch(30, 'Box 31', '31'), true)
  assert.equal(matchesBoxSearch(10, 'Caja 11', '1'), true)
  assert.equal(matchesBoxSearch(1, 'Caja 2', '12'), false)
  assert.equal(matchesBoxSearch('party', 'Equipo', 'equi'), true)
  assert.equal(matchesBoxSearch('all', 'All boxes and party', 'all'), true)
  assert.equal(matchesBoxSearch(1, 'Caja 2', ''), true)
  assert.equal(matchesBoxSearch(1, 'Caja 2', '99'), false)
})
