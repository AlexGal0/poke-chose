import { test } from 'node:test'
import assert from 'node:assert/strict'
import { baseStatsFromResponse, getBaseStats } from '../src/api/stats.ts'
import type { StatsResponse } from '../src/api/stats.ts'
import { STATS, highestBaseStats, isBaseStats, statsResource, statsForm, totalBaseStats } from '../src/domain/stats.ts'
import { statLabel, statsFormLabel } from '../src/i18n/stats.ts'
import es from '../src/i18n/locales/es/translation.json' with { type: 'json' }
import en from '../src/i18n/locales/en/translation.json' with { type: 'json' }

const entries = (values: number[]) => STATS.map((name, index) => ({ stat: { name }, base_stat: values[index] }))

test('base strengths select the two highest values, retaining all ties without changing the stats', () => {
  const dewott = { hp: 75, attack: 75, defense: 60, 'special-attack': 83, 'special-defense': 60, speed: 60 }
  const original = { ...dewott }
  assert.deepEqual(highestBaseStats(dewott), ['special-attack', 'hp', 'attack'])
  assert.deepEqual(dewott, original)
  assert.deepEqual(highestBaseStats({ ...dewott, hp: 50, speed: 90 }), ['speed', 'special-attack'])
  assert.deepEqual(highestBaseStats({ hp: 100, attack: 100, defense: 100, 'special-attack': 100, 'special-defense': 100, speed: 100 }), [...STATS])
})
const response = (): StatsResponse => ({
  id: 25, name: 'pikachu', stats: entries([35, 55, 40, 50, 50, 90]),
  past_stats: [
    { generation: { name: 'generation-i' }, stats: [{ stat: { name: 'special' }, base_stat: 50 }] },
    { generation: { name: 'generation-v' }, stats: [{ stat: { name: 'defense' }, base_stat: 30 }, { stat: { name: 'special-defense' }, base_stat: 40 }] },
  ],
})

test('Pikachu uses sparse Gen V history, retaining unchanged current stats', () => {
  const stats = baseStatsFromResponse(response())
  assert.deepEqual(STATS.map(stat => stats[stat]), [35, 55, 30, 50, 40, 90])
  assert.equal(totalBaseStats(stats), 300)
})

test('history is selected per stat and inclusive generation, regardless of ordering', () => {
  const data = response()
  data.past_stats.unshift(
    { generation: { name: 'generation-vii' }, stats: [{ stat: { name: 'attack' }, base_stat: 45 }, { stat: { name: 'defense' }, base_stat: 35 }] },
    { generation: { name: 'generation-iv' }, stats: [{ stat: { name: 'speed' }, base_stat: 20 }] },
  )
  const stats = baseStatsFromResponse(data)
  assert.equal(stats.attack, 45)
  assert.equal(stats.defense, 30)
  assert.equal(stats.speed, 90)
})

test('unchanged species and Gen I-only history retain all modern six stats', () => {
  const data = response()
  data.past_stats = [data.past_stats[0]]
  assert.deepEqual(STATS.map(stat => baseStatsFromResponse(data)[stat]), [35, 55, 40, 50, 50, 90])
  data.past_stats = []
  data.stats.reverse()
  assert.equal(baseStatsFromResponse(data)['special-attack'], 50)
})

test('Raichu retains its Black/White Speed before the Gen VI increase', () => {
  const data: StatsResponse = { id: 26, name: 'raichu', stats: entries([60, 90, 55, 90, 80, 110]), past_stats: [
    { generation: { name: 'generation-v' }, stats: [{ stat: { name: 'speed' }, base_stat: 100 }] },
  ] }
  assert.equal(baseStatsFromResponse(data).speed, 100)
  assert.equal(totalBaseStats(baseStatsFromResponse(data)), 475)
})

test('rejects absent history, incomplete, duplicate and invalid stats instead of guessing', () => {
  assert.throws(() => baseStatsFromResponse({ ...response(), past_stats: undefined } as unknown as StatsResponse))
  assert.throws(() => baseStatsFromResponse({ ...response(), stats: response().stats.slice(1) }))
  assert.throws(() => baseStatsFromResponse({ ...response(), stats: [...response().stats, response().stats[0]] }))
  for (const value of [0, -1, 256, 1.5, NaN]) {
    const data = response()
    data.stats[0].base_stat = value
    assert.throws(() => baseStatsFromResponse(data))
  }
  assert.equal(isBaseStats({ hp: 35 }), false)
  assert.equal(isBaseStats(null), false)
})

test('PK5 forms resolve to Black/White varieties including forms with unchanged types', () => {
  assert.equal(statsResource(386, 1), 'deoxys-attack')
  assert.equal(statsResource(487, 1), 'giratina-origin')
  assert.equal(statsResource(479, 2), 'rotom-wash')
  assert.equal(statsResource(492, 1), 'shaymin-sky')
  assert.equal(statsResource(413, 2), 'wormadam-trash')
  assert.equal(statsResource(555, 1), 'darmanitan-zen')
  assert.equal(statsResource(648, 1), 'meloetta-pirouette')
  assert.equal(statsResource(493, 10), '493')
  assert.equal(statsResource(25), '25')
  assert.equal(statsForm(25), null)
  for (const [species, form] of [[0, 0], [650, 0], [25, -1], [25, 32], [386, 4], [641, 1], [646, 2]]) {
    assert.throws(() => statsResource(species, form))
  }
})

test('stat and form presentation keys exist in both locales', () => {
  for (const locale of [es, en]) {
    const t = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], locale) as string
    for (const stat of STATS) assert.ok(statLabel(t, stat))
    for (const [species, count] of [[351, 4], [386, 4], [413, 3], [479, 6], [487, 2], [492, 2], [555, 2], [648, 2]]) {
      for (let form = 0; form < count; form++) assert.ok(statsFormLabel(t, statsForm(species, form)!))
    }
  }
})

test('versioned stat cache validates entries and isolates forms without changing old Pokémon caches', async t => {
  const storage = new Map<string, string>()
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } })
  t.after(() => { if (old) Object.defineProperty(globalThis, 'localStorage', old); else Reflect.deleteProperty(globalThis, 'localStorage') })
  const requests: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    requests.push(url)
    const data = url.endsWith('deoxys-attack')
      ? { id: 10001, name: 'deoxys-attack', stats: entries([50, 180, 20, 180, 20, 150]), past_stats: [] }
      : response()
    return new Response(JSON.stringify(data), { status: 200 })
  })
  storage.set('poke-chose:cache:pokemon-bw-v1-25', JSON.stringify({ id: 25 }))
  storage.set('poke-chose:cache:base-stats-bw-v1-25', JSON.stringify({ resource: '25', stats: { hp: 35 } }))
  assert.equal((await getBaseStats(25)).defense, 30)
  await getBaseStats(25)
  assert.equal(requests.length, 1)
  assert.equal((await getBaseStats(386, 1)).attack, 180)
  assert.equal(requests.length, 2)
  assert.equal(storage.get('poke-chose:cache:pokemon-bw-v1-25'), '{"id":25}')
  storage.set('poke-chose:cache:base-stats-bw-v1-25', JSON.stringify({ resource: '26', stats: baseStatsFromResponse(response()) }))
  await getBaseStats(25)
  assert.equal(requests.length, 3)
  await assert.rejects(getBaseStats(26), /Unexpected/)
})

test('failed requests and cancellation propagate for retry', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))
  await assert.rejects(getBaseStats(25))
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    init.signal?.throwIfAborted()
    return new Response(JSON.stringify(response()))
  })
  await assert.rejects(getBaseStats(25, 0, AbortSignal.abort()), { name: 'AbortError' })
})
