import test from 'node:test'
import assert from 'node:assert/strict'
import { levelFromExperience } from '../src/domain/experience.ts'
import { getExperienceLevels } from '../src/api/experience.ts'
import { parsePk5, parseStoredPk5 } from '../bridge/parser.ts'
import { boxesEqual, isSaveSnapshot } from '../src/models/party.ts'
import { pk5Fixture } from './helpers/save-fixture.ts'

const levels = Array.from({ length: 100 }, (_, index) => ({ level: index + 1, experience: index === 0 ? 0 : (index + 1) ** 3 }))

test('box experience survives every shuffle, participates in updates and validates legacy snapshots', () => {
  for (let shuffle = 0; shuffle < 32; shuffle++) {
    const bytes = pk5Fixture(502, 25, shuffle)
    const before = Buffer.from(bytes)
    const box = { ...parseStoredPk5(bytes.subarray(0, 136))!, box: 0, slot: 0 }
    assert.equal(box.experience, 15625)
    assert.equal(levelFromExperience(box.experience!, levels), parsePk5(bytes).level)
    assert.deepEqual(bytes, before)
    assert.equal(boxesEqual([box], [{ ...box, experience: 17576 }]), false)
    const snapshot = { status: 'ready', message: 'ready', party: [], boxes: [box], pokedex: null, updatedAt: null, backup: false }
    assert.equal(isSaveSnapshot(snapshot), true)
    for (const experience of [-1, 1.5, 0x100000000, NaN]) {
      assert.equal(isSaveSnapshot({ ...snapshot, boxes: [{ ...box, experience }] }), false)
    }
    assert.equal(isSaveSnapshot({ ...snapshot, boxes: [{ ...box, experience: undefined }] }), true)
  }
})

test('levels match party fields at every exact threshold and immediately before the next one', () => {
  for (const row of levels) {
    for (const experience of [row.experience, row.level === 100 ? 0xffffffff : levels[row.level].experience - 1]) {
      const bytes = pk5Fixture(502, row.level, 9, undefined, { currentHp: 60, maxHp: 80, experience })
      assert.equal(levelFromExperience(parseStoredPk5(bytes.subarray(0, 136))!.experience!, [...levels].reverse()), parsePk5(bytes).level)
    }
  }
  assert.equal(levelFromExperience(-1, levels), null)
  assert.equal(levelFromExperience(1.5, levels), null)
  assert.equal(levelFromExperience(25, []), null)
  assert.equal(levelFromExperience(25, levels.map(row => ({ ...row, experience: 0 }))), null)
  assert.equal(levelFromExperience(25, levels.map(row => ({ ...row, level: 1 }))), null)
})

test('experience requests share species and growth tables, isolate cancellation and retry failures', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  let fail = true
  globalThis.fetch = async input => {
    const path = String(input)
    calls.push(path)
    if (path.endsWith('/640') && fail) return new Response('', { status: 503 })
    return Response.json(path.includes('/growth-rate/') ? { levels } : { growth_rate: { name: 'medium' } })
  }
  try {
    const controller = new AbortController()
    const cancelled = getExperienceLevels(638, controller.signal)
    controller.abort()
    const [, a, b, c] = await Promise.allSettled([cancelled, getExperienceLevels(638), getExperienceLevels(638), getExperienceLevels(639)])
    await assert.rejects(cancelled, { name: 'AbortError' })
    for (const result of [a, b, c]) assert.equal(result.status, 'fulfilled')
    assert.equal(calls.filter(path => path.endsWith('/638')).length, 1)
    assert.equal(calls.filter(path => path.includes('/growth-rate/')).length, 1)
    await getExperienceLevels(638)
    assert.equal(calls.filter(path => path.endsWith('/638')).length, 1)
    await assert.rejects(getExperienceLevels(640))
    fail = false
    assert.deepEqual(await getExperienceLevels(640), levels)
  } finally { globalThis.fetch = original }
})
