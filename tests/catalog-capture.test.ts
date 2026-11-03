import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesCatalogCapture } from '../src/domain/catalog-capture.ts'

test('missing capture filter uses caught flags including species no longer owned, not seen flags', () => {
  const caught = new Set([1, 650])
  assert.equal(matchesCatalogCapture(1, true, caught), false)
  assert.equal(matchesCatalogCapture(650, true, caught), false)
  assert.equal(matchesCatalogCapture(25, true, caught), true)
  assert.equal(matchesCatalogCapture(1, false, caught), true)
})

test('unknown Pokédex differs from a valid empty Pokédex', () => {
  assert.equal(matchesCatalogCapture(1, true, null), false)
  assert.equal(matchesCatalogCapture(1, true, new Set()), true)
  assert.equal(matchesCatalogCapture(1, false, null), true)
})
