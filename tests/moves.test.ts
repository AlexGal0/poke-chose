import test from 'node:test'
import assert from 'node:assert/strict'
import { blackWhiteLearnset, blackWhiteMove } from '../src/domain/moves.ts'
import type { MoveResponse } from '../src/domain/moves.ts'
import { getLevelMoves } from '../src/api/moves.ts'
import i18n from '../src/i18n/index.ts'
import { categoryLabel, moveDescription, moveDescriptionSource } from '../src/i18n/moves.ts'

const t = i18n.getFixedT('es')
const resource = (name: string, id = 0) => ({ name, url: `https://pokeapi.co/api/v2/version-group/${id}/` })
const move: MoveResponse = { name: 'vine-whip', pp: 25, type: resource('grass'), damage_class: resource('physical'), names: [{ name: 'Látigo Cepa', language: resource('es') }], flavor_text_entries: [
  { flavor_text: 'Texto moderno.', language: resource('es'), version_group: resource('x-y') },
  { flavor_text: 'Golpea con lianas.\nDaño físico.', language: resource('es'), version_group: resource('black-white') },
], past_values: [{ pp: 10, type: null, version_group: resource('diamond-pearl', 8) }, { pp: 15, type: null, version_group: resource('x-y', 15) }] }
test('BW learnset selects only level-up, orders levels, deduplicates equal rows but preserves relearning', () => {
  const detail = (level: number, method = 'level-up', version = 'black-white') => ({ level_learned_at: level, move_learn_method: resource(method), version_group: resource(version) })
  assert.deepEqual(blackWhiteLearnset({ moves: [
    { move: resource('vine-whip'), version_group_details: [detail(7), detail(7), detail(20), detail(2, 'machine'), detail(1, 'level-up', 'black-2-white-2')] },
    { move: resource('tackle'), version_group_details: [detail(1)] },
    { move: resource('egg-move'), version_group_details: [detail(0, 'egg')] },
  ] }), [{ slug: 'tackle', level: 1 }, { slug: 'vine-whip', level: 7 }, { slug: 'vine-whip', level: 20 }])
})
test('move type and PP resolve independently before later changes; description matches BW in Spanish', () => {
  const result = blackWhiteMove(move, 'es')
  assert.equal(result.pp, 15)
  assert.equal(result.type, 'grass')
  assert.equal(categoryLabel(t, result.categoryId), 'Físico')
  assert.equal(result.name, 'Látigo Cepa')
  assert.equal(moveDescription(t, result), 'Golpea con lianas. Daño físico.')
  assert.equal(blackWhiteMove({ ...move, type: resource('fairy'), past_values: [{ pp: null, type: resource('normal'), version_group: resource('x-y', 15) }] }, 'es').type, 'normal')
  assert.equal(blackWhiteMove({ ...move, past_values: [{ pp: 10, type: null, version_group: resource('black-white', 11) }] }, 'es').pp, 25)
  assert.equal(moveDescription(t, blackWhiteMove({ ...move, flavor_text_entries: [] }, 'es')), 'Descripción no disponible en español.')
})
test('API loads a variety by its name and rejects failed/aborted requests for retry', async () => {
  const original = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = async input => {
    urls.push(String(input))
    return new Response(JSON.stringify(String(input).includes('/pokemon/') ? { moves: [{ move: resource('vine-whip'), version_group_details: [{ level_learned_at: 7, move_learn_method: resource('level-up'), version_group: resource('black-white') }] }] } : move))
  }
  try {
    assert.equal((await getLevelMoves('wormadam-sandy', 'es'))[0].pp, 15)
    assert.ok(urls[0].endsWith('/pokemon/wormadam-sandy'))
    globalThis.fetch = async () => new Response('', { status: 503 })
    await assert.rejects(getLevelMoves('snivy', 'es'), /PokéAPI/)
    const controller = new AbortController()
    controller.abort()
    globalThis.fetch = async () => new Response(JSON.stringify({ moves: [] }))
    await assert.rejects(getLevelMoves('snivy', 'es', controller.signal), { name: 'AbortError' })
  } finally { globalThis.fetch = original }
})
test('Spain Spanish from nearby games takes precedence over BW English and Latin American Spanish', () => {
  const text = (language: string, version: string, flavor_text: string) => ({ language: resource(language), version_group: resource(version), flavor_text })
  const result = blackWhiteMove({ ...move, names: [
    { name: 'Nombre latino', language: resource('es-419') },
    { name: 'Látigo Cepa', language: resource('es') },
  ], flavor_text_entries: [
    text('en', 'black-white', 'English text.'),
    text('es-419', 'black-white', 'Texto latinoamericano.'),
    text('es', 'x-y', 'Texto de X/Y.'),
    text('es', 'black-2-white-2', 'Texto español de Negro 2/Blanco 2.'),
  ] }, 'es')
  assert.equal(result.name, 'Látigo Cepa')
  assert.equal(moveDescription(t, result), 'Texto español de Negro 2/Blanco 2.')
  assert.equal(moveDescriptionSource(t, result.descriptionVersionGroup), 'Texto de Negro 2/Blanco 2')
  assert.equal(result.pp, 15)
  assert.equal(moveDescriptionSource(t, blackWhiteMove(move, 'es').descriptionVersionGroup), null)
  assert.equal(moveDescription(t, blackWhiteMove({ ...move, flavor_text_entries: [text('en', 'black-white', 'English text.')] }, 'es')), '(EN) English text.')
})
test('English locale prefers English flavor text and name without a fallback marker', () => {
  const text = (language: string, version: string, flavor_text: string) => ({ language: resource(language), version_group: resource(version), flavor_text })
  const result = blackWhiteMove({ ...move, names: [{ name: 'Vine Whip', language: resource('en') }, { name: 'Látigo Cepa', language: resource('es') }], flavor_text_entries: [
    text('en', 'black-white', 'Strikes the foe with slender, whiplike vines.'),
    text('es', 'black-white', 'Golpea con lianas.'),
  ] }, 'en')
  assert.equal(result.name, 'Vine Whip')
  assert.equal(moveDescription(t, result), 'Strikes the foe with slender, whiplike vines.')
  assert.equal(result.descriptionLanguage, null)
})
