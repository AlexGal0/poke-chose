import test from 'node:test'
import assert from 'node:assert/strict'
import { xyMegaEvolutions } from '../src/games/xy/mega-evolutions.ts'
import { megaAvailability } from '../src/domain/mega-evolutions.ts'
import { isBaseStats, totalBaseStats } from '../src/domain/stats.ts'

test('XY adapter includes traded X/Y variants and the event stone, excluding ORAS and unreleased forms', async () => {
  const entries = await xyMegaEvolutions.load('en')
  assert.equal(entries.length, 28)
  assert.equal(new Set(entries.map(entry => entry.id)).size, 28)
  assert.equal(new Set(entries.map(entry => entry.inventoryKey)).size, 28)
  assert.deepEqual(entries.filter(entry => entry.name === 'charizard').map(entry => entry.variant), ['X', 'Y'])
  assert.deepEqual(entries.filter(entry => entry.name === 'mewtwo').map(entry => entry.variant), ['X', 'Y'])
  assert.ok(entries.some(entry => entry.id === 'blazikenite'))
  for (const name of ['rayquaza', 'latios', 'latias', 'diancie', 'beedrill', 'salamence']) assert.ok(!entries.some(entry => entry.name === name))
  for (const entry of entries) {
    assert.ok(isBaseStats(entry.baseStats))
    assert.ok(isBaseStats(entry.megaStats))
    assert.equal(entry.baseStats.hp, entry.megaStats.hp)
    // Mega Alakazam gained 90, rather than 100, in XY.
    assert.equal(totalBaseStats(entry.megaStats) - totalBaseStats(entry.baseStats), entry.name === 'alakazam' ? 90 : 100)
  }
})

test('XY stats preserve historical Alakazam and negative mega changes', async () => {
  const entries = await xyMegaEvolutions.load('en')
  assert.equal(entries.find(entry => entry.name === 'alakazam')!.megaStats['special-defense'], 95)
  const garchomp = entries.find(entry => entry.name === 'garchomp')!
  assert.equal(garchomp.megaStats.speed - garchomp.baseStats.speed, -10)
  const mewtwo = entries.find(entry => entry.id === 'mewtwonite-y')!
  assert.ok(mewtwo.megaStats.defense < mewtwo.baseStats.defense)
})

test('mega preview requires both an owned non-egg Pokémon and a stone in the same current inventory', async () => {
  const entry = (await xyMegaEvolutions.load('es')).find(entry => entry.id === 'lucarionite')!
  assert.equal(entry.inventoryKey, '673')
  assert.equal(entry.stoneName, 'Lucarita')
  const inventory = { quantities: { [entry.inventoryKey]: { bag: 0, held: 1 } }, stale: false }
  const owned = [{ id: entry.speciesId }]
  assert.equal(megaAvailability(entry, inventory, owned, false).canPreview, true)
  assert.deepEqual(megaAvailability(entry, inventory, [], false), { quantity: { bag: 0, held: 1 }, owned: false, hasStone: true, canPreview: false })
  assert.equal(megaAvailability(entry, inventory, [{ id: entry.speciesId, isEgg: true }], false).canPreview, false)
  assert.equal(megaAvailability(entry, { quantities: {}, stale: false }, owned, false).canPreview, false)
  assert.equal(megaAvailability(entry, { ...inventory, stale: true }, owned, false).canPreview, false)
  assert.equal(megaAvailability(entry, inventory, owned, true).canPreview, false)
  assert.equal(megaAvailability(entry, inventory, null, false).owned, null)
  assert.equal(megaAvailability(entry, { quantities: null, stale: true }, owned, false).hasStone, null)
  assert.equal(megaAvailability(entry, { quantities: { [entry.inventoryKey]: { bag: 2, held: 1 } }, stale: false }, owned, false).quantity?.bag, 2)
})

test('mega resources resolve locale explicitly, preserve stable keys and honor cancellation', async () => {
  const es = await xyMegaEvolutions.load('es')
  const en = await xyMegaEvolutions.load('en')
  assert.deepEqual(es.map(entry => entry.inventoryKey), en.map(entry => entry.inventoryKey))
  assert.equal(en.find(entry => entry.id === 'lucarionite')!.stoneName, 'Lucarionite')
  assert.equal((await xyMegaEvolutions.load('unknown'))[0].stoneName, en[0].stoneName)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(xyMegaEvolutions.load('es', controller.signal))
})
