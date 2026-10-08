import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NATURES, natureDetails } from '../src/domain/nature.ts'
import { natureLabel, natureEffectLabel } from '../src/i18n/nature.ts'
import es from '../src/i18n/locales/es/translation.json' with { type: 'json' }
import en from '../src/i18n/locales/en/translation.json' with { type: 'json' }

test('all stored nature IDs retain their names and descriptive effects', () => {
  // Nature ordering uses attack, defense, speed, special attack, special defense.
  // The reference 5×5 grid independently verifies the explicit presentation map.
  const order = ['attack', 'defense', 'speed', 'special-attack', 'special-defense']
  assert.equal(NATURES.length, 25)
  assert.equal(new Set(NATURES).size, 25)
  NATURES.forEach((name, id) => {
    const increased = order[Math.floor(id / 5)]
    const decreased = order[id % 5]
    const nature = natureDetails(id)!
    assert.equal(nature.id, name)
    if (increased === decreased) assert.equal(nature.kind, 'neutral')
    else {
      assert.equal(nature.kind, 'changed')
      if (nature.kind === 'changed') assert.deepEqual([nature.increased, nature.decreased], [increased, decreased])
    }
  })
  assert.deepEqual(natureDetails(13), { id: 'jolly', kind: 'changed', increased: 'speed', decreased: 'special-attack' })
  assert.deepEqual(natureDetails(15), { id: 'modest', kind: 'changed', increased: 'special-attack', decreased: 'attack' })
})

test('missing and invalid nature IDs stay unknown instead of becoming neutral', () => {
  for (const id of [undefined, null, '0', '', -1, 25, 255, 1.5, NaN, Infinity, {}, []]) assert.equal(natureDetails(id), null)
  for (const id of [0, 6, 12, 18, 24]) assert.equal(natureDetails(id)?.kind, 'neutral')
})

test('nature names and descriptive stat effects resolve in both locales', () => {
  for (const locale of [es, en]) {
    const t = (key: string, params?: Record<string, unknown>) => {
      const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], locale)
      assert.equal(typeof value, 'string', key)
      return (value as string).replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(params?.[name] ?? ''))
    }
    for (const nature of NATURES) assert.ok(natureLabel(t, nature))
    const jolly = natureDetails(13)!
    if (jolly.kind !== 'changed') assert.fail('Jolly should have descriptive effects')
    assert.ok(natureEffectLabel(t, 'increased', jolly.increased).includes(t('statistics.stats.speed')))
    assert.ok(natureEffectLabel(t, 'decreased', jolly.decreased).includes(t('statistics.stats.special-attack')))
    assert.equal(natureLabel(t, 'jolly'), locale === es ? 'Alegre' : 'Jolly')
  }
})
