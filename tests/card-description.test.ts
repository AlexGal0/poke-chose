import test from 'node:test'
import assert from 'node:assert/strict'
import { cardDescription } from '../src/api/card-description.ts'

test('card descriptions prioritize language before edition, prefer Black/White and normalize text', () => {
  const entries = [
    { flavor_text: 'Future text', language: { name: 'es' }, version: { name: 'scarlet' } },
    { flavor_text: 'English Black', language: { name: 'en' }, version: { name: 'black' } },
    { flavor_text: 'Texto\n de\fBlanco', language: { name: 'es' }, version: { name: 'white' } },
  ]
  assert.equal(cardDescription(entries, 'es'), 'Texto de Blanco')
  assert.equal(cardDescription(entries, 'fr'), 'English Black')
  assert.equal(cardDescription(entries.slice(0, 2), 'es'), 'Future text')
  assert.equal(cardDescription(entries.slice(0, 1), 'es'), 'Future text')
  assert.equal(cardDescription(entries.filter(entry => entry.language.name === 'en'), 'es'), 'English Black')
  assert.equal(cardDescription([], 'es'), null)
})
