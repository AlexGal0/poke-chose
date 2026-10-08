import test from 'node:test'
import assert from 'node:assert/strict'
import { blackWhiteFieldMoves, FIELD_MOVES, fieldMoveResource, matchesFieldMove } from '../src/domain/field-moves.ts'
import { getFieldMoves } from '../src/api/field-moves.ts'
import type { LearnsetResponse } from '../src/domain/moves.ts'
import i18n from '../src/i18n/index.ts'
import { fieldMoveLabel } from '../src/i18n/field-moves.ts'

const entry = (move: string, method = 'machine', version = 'black-white') => ({ move: { name: move }, version_group_details: [{ level_learned_at: 0, move_learn_method: { name: method }, version_group: { name: version } }] })

test('BW field compatibility includes all eight TM/HM moves and excludes other methods and versions', () => {
  assert.deepEqual(blackWhiteFieldMoves({ moves: FIELD_MOVES.map(move => entry(move)) }), FIELD_MOVES)
  assert.deepEqual(blackWhiteFieldMoves({ moves: [entry('fly'), entry('fly'), entry('surf', 'level-up'), entry('cut', 'machine', 'black-2-white-2'), entry('flash', 'machine', 'x-y'), entry('rock-smash'), entry('dig', 'egg')] }), ['fly'])
  assert.deepEqual(blackWhiteFieldMoves({ moves: [] }), [])
  assert.throws(() => blackWhiteFieldMoves({} as LearnsetResponse))
})

test('filter matches compatibility independently of equipped moves, excludes eggs and preserves form identity', () => {
  assert.equal(matchesFieldMove({ id: 580 }, ['surf'], ['surf', 'fly']), true)
  assert.equal(matchesFieldMove({ id: 580 }, ['dig'], ['surf', 'fly']), false)
  assert.equal(matchesFieldMove({ id: 580, isEgg: true }, ['surf'], ['surf']), false)
  assert.equal(matchesFieldMove({ id: 580 }, ['surf']), false)
  assert.equal(matchesFieldMove({ id: 580, isEgg: true }, []), true)
  assert.equal(matchesFieldMove({ id: 580 }, ['fly', 'surf'], ['fly', 'surf']), true)
  assert.equal(matchesFieldMove({ id: 580 }, ['fly', 'surf'], ['fly']), false)
  assert.equal(fieldMoveResource({ id: 492, form: 1 }), 'shaymin-sky')
  assert.equal(fieldMoveResource({ id: 492 }), 'shaymin-land')
  for (const locale of ['es', 'en']) {
    for (const move of FIELD_MOVES) assert.notEqual(fieldMoveLabel(i18n.getFixedT(locale), move), `fieldMoves.moves.${move}`)
  }
})

test('API deduplicates species/forms, caches empty compatibility and retries failed or invalid responses', async () => {
  const originalFetch = globalThis.fetch
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const stored = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) } })
  const calls: string[] = []
  let fail = true
  globalThis.fetch = async input => {
    const url = String(input)
    calls.push(url)
    if (url.endsWith('/552') && fail) return new Response('', { status: 503 })
    return Response.json({ moves: url.endsWith('/580') ? [entry('surf'), entry('fly')] : [] })
  }
  try {
    const [a, b] = await Promise.all([getFieldMoves('580'), getFieldMoves('580')])
    assert.deepEqual(a, ['fly', 'surf'])
    assert.deepEqual(b, a)
    assert.equal(calls.length, 1)
    await getFieldMoves('580')
    assert.equal(calls.length, 1)
    assert.deepEqual(await getFieldMoves('shaymin-sky'), [])
    await getFieldMoves('shaymin-sky')
    assert.equal(calls.length, 2)
    assert.ok([...stored.keys()].some(key => key.includes('field-moves-bw-v1-shaymin-sky')))
    await assert.rejects(getFieldMoves('552'))
    fail = false
    assert.deepEqual(await getFieldMoves('552'), [])
    globalThis.fetch = async () => Response.json({})
    await assert.rejects(getFieldMoves('575'))
    globalThis.fetch = async () => Response.json({ moves: [entry('flash')] })
    assert.deepEqual(await getFieldMoves('575'), ['flash'])
  } finally {
    globalThis.fetch = originalFetch
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
