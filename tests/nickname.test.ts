import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePk5, parseStoredPk5, parseSave } from '../bridge/parser.ts'
import { pk5Fixture, saveFixture, refreshFixtureChecksums } from './helpers/save-fixture.ts'
import { partiesEqual, boxesEqual, isSaveSnapshot } from '../src/models/party.ts'
import { matchesCollectionTags } from '../src/domain/collection-search.ts'
import i18n from '../src/i18n/index.ts'
import { typeLabel } from '../src/i18n/types.ts'

const t = i18n.getFixedT('es')

test('custom PK5 names survive all shuffle values in party and stored records without changing input', () => {
  for (let shuffle = 0; shuffle < 32; shuffle++) {
    const data = pk5Fixture(502, 25, shuffle, { text: 'Ázul ñ' })
    const original = Buffer.from(data)
    assert.equal(parsePk5(data).nickname, 'Ázul ñ')
    assert.equal(parseStoredPk5(data.subarray(0, 136))!.nickname, 'Ázul ñ')
    assert.deepEqual(data, original)
  }
})
test('default species text is not a nickname; terminators, empty names and gender glyphs decode safely', () => {
  assert.equal(parsePk5(pk5Fixture(502)).nickname, null)
  assert.equal(parsePk5(pk5Fixture(502, 25, 9, { text: 'DEWOTT', nicknamed: false })).nickname, null)
  assert.equal(parsePk5(pk5Fixture(502, 25, 9, { text: '', terminator: 0xffff })).nickname, null)
  assert.equal(parsePk5(pk5Fixture(502, 25, 9, { text: 'AZUL', terminator: 0 })).nickname, 'AZUL')
  assert.equal(parsePk5(pk5Fixture(502, 25, 9, { text: '1234567890' })).nickname, '1234567890')
  assert.equal(parsePk5(pk5Fixture(502, 25, 9, { text: 'A\u246d\u246e' })).nickname, 'A♂♀')
})
test('rename-only save changes are retained in party and boxes and affect SSE comparisons', () => {
  const save = saveFixture([pk5Fixture(502, 25, 9, { text: 'Azul' })])
  pk5Fixture(502, 25, 9, { text: 'Mar' }).subarray(0, 136).copy(save, 0x400)
  refreshFixtureChecksums(save)
  const original = Buffer.from(save)
  const parsed = parseSave(save)
  assert.equal(parsed.party[0].nickname, 'Azul')
  assert.equal(parsed.boxes[0].nickname, 'Mar')
  assert.equal(partiesEqual(parsed.party, [{ ...parsed.party[0], nickname: 'Azul2' }]), false)
  assert.equal(boxesEqual(parsed.boxes, [{ ...parsed.boxes[0], nickname: 'Mar2' }]), false)
  assert.equal(partiesEqual([{ ...parsed.party[0], nickname: undefined }], [{ ...parsed.party[0], nickname: null }]), true)
  assert.deepEqual(save, original)
  const snapshot = { status: 'ready', message: '', party: parsed.party, boxes: parsed.boxes, pokedex: null, updatedAt: null, backup: false }
  assert.equal(isSaveSnapshot(snapshot), true)
  for (const nickname of [42, '', ' ', '12345678901', '\u0001']) {
    assert.equal(isSaveSnapshot({ ...snapshot, party: [{ ...parsed.party[0], nickname }] }), false)
  }
})
test('collection search combines nickname, species and types while preserving exact nickname case', () => {
  const pokemon = { id: 502, name: 'dewott', nickname: 'aZúl', types: ['water' as const], sprite: null }
  assert.equal(matchesCollectionTags(pokemon, 'AZUL dew agua', type => typeLabel(t, type)), true)
  assert.equal(matchesCollectionTags(pokemon, 'azul fuego', type => typeLabel(t, type)), false)
  assert.equal(pokemon.nickname, 'aZúl')
})
