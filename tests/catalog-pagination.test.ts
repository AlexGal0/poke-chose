import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogPageSize } from '../src/components/catalog-pagination.ts'

test('catalog pages fill rows at narrow and wide column counts', () => {
  for (const columns of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const size = catalogPageSize(columns)
    assert.ok(size >= 12)
    assert.equal(size % columns, 0)
    assert.ok(size - columns < 12)
  }
  assert.equal(catalogPageSize(5), 15)
  assert.equal(catalogPageSize(7), 14)
})

test('catalog page sizing tolerates unavailable layout measurements', () => {
  for (const columns of [0, -1, NaN, Infinity]) assert.equal(catalogPageSize(columns), 12)
})
