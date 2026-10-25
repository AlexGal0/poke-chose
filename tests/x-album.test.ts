import test from 'node:test'
import assert from 'node:assert/strict'
import { albumDescription } from '../src/games/core/album.ts'
import { blackAlbum } from '../src/games/black/album.ts'
import { xAlbum } from '../src/games/x/album.ts'
import { xCatalogRules } from '../src/games/x/catalog.ts'
import { discoveredSpecies } from '../src/domain/discovery.ts'

test('album descriptions prioritize locale, then X/Y, with English fallback and normalized whitespace', () => {
  const entries = [
    { flavor_text: 'Otra edición', language: { name: 'es' }, version: { name: 'black' } },
    { flavor_text: 'English X', language: { name: 'en' }, version: { name: 'x' } },
    { flavor_text: 'Texto\n de\fY', language: { name: 'es' }, version: { name: 'y' } },
    { flavor_text: 'Texto X', language: { name: 'es' }, version: { name: 'x' } },
  ]
  assert.equal(albumDescription(entries, 'es', ['x', 'y']), 'Texto X')
  assert.equal(albumDescription(entries.slice(0, 3), 'es', ['x', 'y']), 'Texto de Y')
  assert.equal(albumDescription(entries.slice(0, 2), 'es', ['x', 'y']), 'Otra edición')
  assert.equal(albumDescription(entries, 'fr', ['x', 'y']), 'English X')
  assert.equal(albumDescription([], 'es', ['x', 'y']), null)
})

test('Kalos album uses the adapter regional species, including older generations and Fairy types', async () => {
  assert.deepEqual(xAlbum.speciesIds, xCatalogRules.regionalSpeciesIds)
  assert.equal(new Set(xAlbum.speciesIds).size, xAlbum.speciesIds.length)
  assert.ok(xAlbum.speciesIds.includes(1))
  assert.ok(xAlbum.speciesIds.includes(650))
  assert.ok(!xAlbum.speciesIds.includes(19))
  const sylveon = await xAlbum.get(700)
  assert.deepEqual(sylveon.types, ['fairy'])
  assert.equal(sylveon.sprite, '/pokemon-x/700.png')
  assert.ok(xAlbum.animation(sylveon)?.startsWith('/battle-sprites/'))
  await assert.rejects(xAlbum.get(999))
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(xAlbum.get(1, controller.signal), { name: 'AbortError' })
})

test('discovery reveals seen and caught without turning seen species into captures', () => {
  const caughtSpeciesIds = new Set([650])
  const seenSpeciesIds = new Set([1])
  const known = discoveredSpecies({ caughtSpeciesIds, seenSpeciesIds })
  assert.deepEqual([...known].sort((a, b) => a - b), [1, 650])
  assert.equal(caughtSpeciesIds.has(1), false)
  assert.equal(discoveredSpecies(null).size, 0)
})


test('shared album adapters retain separate regional rosters and mosaic sizes', () => {
  assert.equal(blackAlbum.speciesIds.length, 156)
  assert.equal(blackAlbum.speciesIds[0], 494)
  assert.equal(blackAlbum.speciesIds.at(-1), 649)
  assert.deepEqual(blackAlbum.columns, { landscape: 13, portrait: 6 })
  assert.ok(!blackAlbum.speciesIds.includes(700))
  assert.ok(xAlbum.speciesIds.includes(700))
  assert.equal(blackAlbum.region, 'Unova')
  assert.equal(xAlbum.region, 'Kalos')
})
