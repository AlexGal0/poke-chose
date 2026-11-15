import test from 'node:test'
import assert from 'node:assert/strict'
import { blackSavedRosterService } from '../src/games/black/saved-roster.ts'
import { blackCatalog } from '../src/games/black/catalog.ts'
import { xSavedRosterService } from '../src/games/x/saved-roster.ts'
import { ySavedRosterService } from '../src/games/y/saved-roster.ts'
import { xCatalog } from '../src/games/x/catalog.ts'
import { yCatalog } from '../src/games/y/catalog.ts'

test('Black manual and synchronized teams use Black/White animations, including forms', () => {
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/'
  const pokemon = { id: 503, name: 'samurott', types: ['water'], sprite: `${base}503.png` }
  for (const service of [blackCatalog, blackSavedRosterService]) {
    assert.equal(service.animation?.(pokemon), `${base}animated/503.gif`)
    assert.equal(service.animation?.({ ...pokemon, sprite: `${base}10001.png` }), `${base}animated/10001.gif`)
    assert.equal(service.animation?.({ ...pokemon, sprite: '/pokemon-x/503.png' }), null)
    assert.equal(service.animation?.({ ...pokemon, sprite: null }), null)
  }
})

test('X and Y manual and synchronized teams resolve local animations without confusing forms', () => {
  const pokemon = { id: 447, name: 'riolu', types: ['fighting'], sprite: '/pokemon-x/447.png' }
  for (const service of [xCatalog, yCatalog, xSavedRosterService, ySavedRosterService]) {
    assert.equal(service.animation?.(pokemon), '/battle-sprites/447.gif')
    assert.equal(service.animation?.({ ...pokemon, sprite: '/pokemon-x/10001.png' }), '/battle-sprites/10001.gif')
    assert.equal(service.animation?.({ ...pokemon, sprite: '/pokemon-x/999999.png' }), null)
    assert.equal(service.animation?.({ ...pokemon, sprite: null }), null)
  }
})
