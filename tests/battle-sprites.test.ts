import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { animatedBattleSprite } from '../src/sources/battle-sprites.ts'
import { xCatalogRules } from '../src/games/x/catalog.ts'

test('battle artwork resolves local animations by variety without confusing species and forms', async () => {
  assert.equal(animatedBattleSprite('/pokemon-x/447.png'), '/battle-sprites/447.gif')
  assert.equal(animatedBattleSprite('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/447.png'), '/battle-sprites/447.gif')
  assert.equal(animatedBattleSprite('/pokemon-x/10001.png'), '/battle-sprites/10001.gif')
  assert.equal(animatedBattleSprite('/pokemon-x/999999.png'), null)
  assert.equal(animatedBattleSprite(null), null)
  for (const id of [447, 654, 10001]) {
    const bytes = await readFile(`public/battle-sprites/${id}.gif`)
    assert.match(bytes.subarray(0, 6).toString(), /^GIF8[79]a$/)
  }
})

test('Kalos regional catalog includes earlier-generation residents and excludes national-only species', () => {
  const regional = xCatalogRules.regionalSpeciesIds!
  assert.equal(regional.length, 457)
  assert.equal(new Set(regional).size, regional.length)
  for (const id of [1, 25, 280, 447, 650, 653, 656, 716, 717, 718]) assert.ok(regional.includes(id), String(id))
  for (const id of [151, 251]) assert.equal(regional.includes(id), false, String(id))
})
