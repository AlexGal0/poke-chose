import test from 'node:test'
import assert from 'node:assert/strict'
import { blackGenderDistribution } from '../src/games/black/gender.ts'
import { xGenderDistribution } from '../src/games/x/gender.ts'
import { genderPercentage, genderDistributionLabel } from '../src/i18n/gender.ts'

test('Black and X provide normalized probabilities using their own generation rules', () => {
  assert.equal(blackGenderDistribution(4)?.female, 127 / 256 * 100)
  assert.equal(xGenderDistribution(4)?.female, 50)
  assert.equal(blackGenderDistribution(1)?.female, 31 / 256 * 100)
  assert.equal(xGenderDistribution(1)?.female, 30 / 252 * 100)
  for (const rate of [1, 2, 4, 6, 7]) {
    assert.notEqual(blackGenderDistribution(rate)?.female, xGenderDistribution(rate)?.female)
    for (const adapter of [blackGenderDistribution, xGenderDistribution]) {
      const result = adapter(rate)!
      assert.equal(result.male + result.female, 100)
      assert.ok(result.male >= 0 && result.female >= 0)
    }
  }
})

test('single-gender and unknown species do not acquire a fictitious 50/50 split', () => {
  for (const adapter of [blackGenderDistribution, xGenderDistribution]) {
    assert.deepEqual(adapter(0), { male: 100, female: 0 })
    assert.deepEqual(adapter(8), { male: 0, female: 100 })
    for (const rate of [-1, -2, 3, 5, 9, NaN, 1.5]) assert.equal(adapter(rate), null)
  }
})

test('presentation rounds adapter results and localizes them without knowing a game', () => {
  assert.equal(genderPercentage(50, 'en'), '50%')
  assert.equal(genderPercentage(30 / 252 * 100, 'en'), '11.9%')
  assert.match(genderPercentage(30 / 252 * 100, 'es'), /11,9/)
  const values: unknown[] = []
  genderDistributionLabel((key, options) => { values.push(key, options); return 'label' }, { male: 75, female: 25 }, 'en')
  assert.deepEqual(values, ['genderRatio.summary', { male: '75%', female: '25%' }])
})
