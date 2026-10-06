import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blackWhiteEvolutionTree, blackWhiteMethods, evolutionMethodFacts, ownedPreevolutions } from '../src/domain/evolution.ts'
import { getEvolutionTree } from '../src/api/evolution.ts'
import type { EvolutionDetail, EvolutionLink } from '../src/models/evolution.ts'
import i18n from '../src/i18n/index.ts'
import { evolutionMethodLabel as composeEvolutionMethodLabel } from '../src/i18n/evolution.ts'

const t = i18n.getFixedT('es')
const resource = (kind: string, id: number, name: string) => ({ name, url: `https://pokeapi.co/api/v2/${kind}/${id}/` })
const method = (overrides: Partial<EvolutionDetail> = {}): EvolutionDetail => ({ trigger: resource('evolution-trigger', 1, 'level-up'), version_group: resource('version-group', 1, 'red-blue'), ...overrides })
const node = (id: number, name: string, methods: EvolutionDetail[] = [], children: EvolutionLink[] = []): EvolutionLink => ({ species: resource('pokemon-species', id, name), evolution_details: methods, evolves_to: children })
const evolutionMethodLabel = (detail: EvolutionDetail, targetId: number, labels: Record<string, string> = {}) =>
  composeEvolutionMethodLabel(t, evolutionMethodFacts(detail, targetId, labels))

test('owned preevolutions include intermediate ancestors but exclude siblings, descendants and the target itself', () => {
  const root = blackWhiteEvolutionTree(node(60, 'poliwag', [], [node(61, 'poliwhirl', [method()], [node(62, 'poliwrath', [method()]), node(186, 'politoed', [method()])])]))!
  assert.deepEqual(ownedPreevolutions(root, 62, new Set([60, 61, 62, 186])).map(node => node.speciesId), [60, 61])
  assert.deepEqual(ownedPreevolutions(root, 62, new Set([60])).map(node => node.speciesId), [60])
  assert.deepEqual(ownedPreevolutions(root, 62, new Set([186])), [])
  assert.deepEqual(ownedPreevolutions(root, 60, new Set([61, 62])), [])
  assert.deepEqual(ownedPreevolutions(root, 999, new Set([60])), [])
  assert.deepEqual(ownedPreevolutions(root, 62, new Set()), [])
})

test('family starts from base even when opening an evolved species; level requirements are attached to children', () => {
  const root = blackWhiteEvolutionTree(node(498, 'tepig', [], [node(499, 'pignite', [method({ min_level: 17 })], [node(500, 'emboar', [method({ min_level: 36 })])])]))!
  assert.equal(root.speciesId, 498)
  assert.equal(evolutionMethodLabel(root.children[0].methods[0], 499), 'Nivel 17')
  assert.equal(evolutionMethodLabel(root.children[0].children[0].methods[0], 500), 'Nivel 36')
})

test('branched family keeps Gen V siblings and drops later species and methods', () => {
  const chain = node(133, 'eevee', [], [
    node(134, 'vaporeon', [method({ trigger: resource('evolution-trigger', 3, 'use-item'), item: resource('item', 84, 'water-stone') })]),
    node(470, 'leafeon', [
      method({ location: resource('location', 8, 'eterna-forest') }),
      method({ version_group: resource('version-group', 11, 'black-white'), location: resource('location', 375, 'pinwheel-forest'), near_special_rock: true }),
      method({ version_group: resource('version-group', 20, 'sword-shield'), trigger: resource('evolution-trigger', 3, 'use-item'), item: resource('item', 85, 'leaf-stone') }),
    ]),
    node(700, 'sylveon', [method({ version_group: resource('version-group', 15, 'x-y') })]),
  ])
  const tree = blackWhiteEvolutionTree(chain)!
  assert.deepEqual(tree.children.map(child => child.speciesId), [134, 470])
  assert.equal(tree.children[1].methods.length, 1)
  assert.match(evolutionMethodLabel(tree.children[1].methods[0], 470), /Bosque Azulejo.*Roca Musgo/)
  assert.equal(blackWhiteMethods([method({ region: resource('region', 7, 'alola') })]).length, 0)
})

test('stone, held-item trade and species trade requirements remain distinct and use Spanish names', () => {
  const stone = resource('item', 107, 'shiny-stone')
  assert.equal(evolutionMethodLabel(method({ trigger: resource('evolution-trigger', 3, 'use-item'), item: stone }), 573, { [stone.url]: 'Piedra Día' }), 'Usar Piedra Día')
  const coat = resource('item', 210, 'metal-coat')
  assert.equal(evolutionMethodLabel(method({ trigger: resource('evolution-trigger', 2, 'trade'), held_item: coat }), 212, { [coat.url]: 'Revestimiento Metálico' }), 'Intercambiar · con Revestimiento Metálico equipado')
  assert.match(evolutionMethodLabel(method({ trigger: resource('evolution-trigger', 2, 'trade'), trade_species: resource('pokemon-species', 616, 'shelmet') }), 589), /Intercambiar · por shelmet/)
})

test('friendship is historical Gen V threshold; time, gender, known move and zero stat condition are not lost', () => {
  const mimic = resource('move', 102, 'mimic')
  const label = evolutionMethodLabel(method({ min_happiness: 160, time_of_day: 'night', gender: 1, known_move: mimic, relative_physical_stats: 0 }), 237, { [mimic.url]: 'Mimético' })
  for (const requirement of ['220', 'de noche', 'hembra', 'Mimético', 'Ataque = Defensa']) assert.ok(label.includes(requirement))
})

test('special Gen V methods describe Shedinja, Wurmple personality and transferred beauty', () => {
  assert.match(evolutionMethodLabel(method({ trigger: resource('evolution-trigger', 4, 'shed') }), 292), /nivel 20.*espacio libre.*Poké Ball/)
  assert.match(evolutionMethodLabel(method({ min_level: 7 }), 266), /personalidad.*no se puede elegir/)
  assert.match(evolutionMethodLabel(method({ min_beauty: 170 }), 350), /belleza ≥ 170.*transferir desde Gen IV/)
  assert.match(evolutionMethodLabel(method({ location: resource('location', 380, 'twist-mountain') }), 471), /Monte Tuerca.*Roca Hielo/)
})

test('standalone species remains a single card, invalid and post-Gen-V species are rejected', () => {
  assert.deepEqual(blackWhiteEvolutionTree(node(494, 'victini'))?.children, [])
  assert.equal(blackWhiteEvolutionTree(node(700, 'sylveon')), null)
  assert.equal(blackWhiteEvolutionTree(node(0, 'invalid')), null)
})

test('API resolves complete family, reuses Pokémon service, localizes items and excludes later requests', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  const stone = resource('item', 107, 'shiny-stone')
  globalThis.fetch = async input => {
    const url = String(input)
    calls.push(url)
    const body = url.includes('/pokemon-species/') ? { evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/293/' } }
      : url.includes('/evolution-chain/') ? { chain: node(572, 'minccino', [], [node(573, 'cinccino', [method({ trigger: resource('evolution-trigger', 3, 'use-item'), item: stone })]), node(700, 'sylveon', [method()])]) }
      : url.includes('/item/') ? { names: [{ name: 'Piedra Día', language: { name: 'es' } }] }
      : { id: url.includes('/573') ? 573 : 572, name: url.includes('/573') ? 'cinccino' : 'minccino', types: [{ slot: 1, type: { name: 'normal' } }], past_types: [], sprites: { versions: { 'generation-v': { 'black-white': { front_default: null } } } } }
    return new Response(JSON.stringify(body))
  }
  try {
    const tree = await getEvolutionTree(573, 'es')
    assert.equal(tree.root.speciesId, 572)
    assert.deepEqual(Object.keys(tree.pokemon), ['572', '573'])
    assert.equal(tree.labels[stone.url], 'Piedra Día')
    assert.equal(calls.some(url => url.includes('/700')), false)
  } finally { globalThis.fetch = original }
})

test('API errors propagate so the dialog can show retry without affecting the team', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response('', { status: 503 })
  try { await assert.rejects(getEvolutionTree(498, 'es'), /PokéAPI/) } finally { globalThis.fetch = original }
})
