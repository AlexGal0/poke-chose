import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { STATS } from '../src/domain/stats.ts'
import { historicalBaseStats, versionLearnset, versionMove, evolutionForRules, knowledgeEvolutionFacts } from '../src/domain/species-knowledge.ts'
import type { KnowledgeEvolutionDetail, KnowledgeLink } from '../src/domain/species-knowledge.ts'
import type { MoveResponse } from '../src/domain/moves.ts'
import { createKnowledgeService } from '../src/games/core/knowledge.ts'
import { xKnowledgeRules as rules } from '../src/games/x/knowledge.ts'
import { baseStatsFromResponse } from '../src/api/stats.ts'

const resource = (kind: string, id: number, name: string) => ({ name, url: `https://pokeapi.co/api/v2/${kind}/${id}/` })
const stats = STATS.map(name => ({ stat: { name }, base_stat: 100 }))
const detail = (extras: Partial<KnowledgeEvolutionDetail> = {}): KnowledgeEvolutionDetail => ({ trigger: resource('evolution-trigger', 1, 'level-up'), version_group: resource('version-group', 15, 'x-y'), ...extras })
const node = (id: number, methods: KnowledgeEvolutionDetail[] = [], children: KnowledgeLink[] = []): KnowledgeLink => ({ species: resource('pokemon-species', id, `species-${id}`), evolution_details: methods, evolves_to: children })
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
  else Reflect.deleteProperty(globalThis, 'localStorage')
})

test('sparse stat history is resolved per field and generation without changing the BW adapter', () => {
  const data = { id: 700, name: 'sylveon', stats, past_stats: [
    { generation: { name: 'generation-vi' }, stats: [{ stat: { name: 'attack' }, base_stat: 80 }] },
    { generation: { name: 'generation-v' }, stats: [{ stat: { name: 'attack' }, base_stat: 60 }] },
  ] }
  assert.equal(historicalBaseStats(data, 6).attack, 80)
  assert.equal(historicalBaseStats(data, 6).hp, 100)
  assert.equal(baseStatsFromResponse(data).attack, 60)
  assert.throws(() => historicalBaseStats({ ...data, stats: [] }, 6))
  assert.throws(() => historicalBaseStats({ ...data, stats: [...stats, stats[0]] }, 6))
})

const move: MoveResponse = {
  name: 'moonblast', type: { name: 'fairy' }, pp: 5, damage_class: { name: 'special' },
  names: [{ name: 'Moonblast', language: { name: 'en' } }],
  flavor_text_entries: [
    { flavor_text: 'Descripción posterior', language: { name: 'es' }, version_group: { name: 'omega-ruby-alpha-sapphire' } },
    { flavor_text: 'XY\ntext', language: { name: 'en' }, version_group: { name: 'x-y' } },
  ],
  past_values: [
    { version_group: resource('version-group', 20, 'sword-shield'), pp: 20, type: null },
    { version_group: resource('version-group', 16, 'omega-ruby-alpha-sapphire'), pp: 10, type: { name: 'fairy' } },
    { version_group: resource('version-group', 15, 'x-y'), pp: 40, type: { name: 'normal' } },
  ],
}
test('moves use exact XY level-up entries and independently resolve historical type and PP', () => {
  const rows = versionLearnset({ moves: [{ move: { name: 'moonblast' }, version_group_details: [
    { version_group: { name: 'x-y' }, move_learn_method: { name: 'level-up' }, level_learned_at: 20 },
    { version_group: { name: 'x-y' }, move_learn_method: { name: 'level-up' }, level_learned_at: 20 },
    { version_group: { name: 'x-y' }, move_learn_method: { name: 'machine' }, level_learned_at: 0 },
    { version_group: { name: 'omega-ruby-alpha-sapphire' }, move_learn_method: { name: 'level-up' }, level_learned_at: 10 },
  ] }] }, 'x-y')
  assert.deepEqual(rows, [{ slug: 'moonblast', level: 20 }])
  const result = versionMove(move, rules, 'es')
  assert.equal(result.type, 'fairy')
  assert.equal(result.pp, 10)
  assert.equal(result.name, 'Moonblast')
  assert.equal(result.description, 'XY text')
  assert.equal(result.descriptionLanguage, 'en')
  assert.equal(versionMove({ ...move, names: [], flavor_text_entries: [] }, rules, 'es').name, 'moonblast')
  assert.equal(versionMove({ ...move, flavor_text_entries: [] }, rules, 'es').description, null)
})

test('evolution keeps affection-based Sylveon and Kalos rocks, rejecting modern methods and species', () => {
  const root = evolutionForRules(node(133, [], [
    node(700, [detail({ min_affection: 2, known_move_type: resource('type', 18, 'fairy') }), detail({ version_group: resource('version-group', 20, 'sword-shield'), min_happiness: 160 })]),
    node(470, [detail({ location: resource('location', 8, 'eterna-forest') }), detail({ location: resource('location', 650, 'kalos-route-20'), near_special_rock: true })]),
    node(979, [detail()]),
  ]), rules, new Set([650]))!
  assert.deepEqual(root.children.map(child => child.id), [700, 470])
  assert.equal(root.children[0].methods.length, 1)
  const facts = knowledgeEvolutionFacts(root.children[0].methods[0], 700, {})
  assert.ok(facts.some(fact => fact.id === 'affection' && fact.params?.value === 2))
  assert.ok(facts.some(fact => fact.id === 'knownType'))
  assert.ok(!facts.some(fact => fact.id === 'friendship'))
  assert.equal(root.children[1].methods.length, 1)
})

test('special requirements survive presentation and unfamiliar conditions stay explicitly unconfirmed', () => {
  assert.ok(knowledgeEvolutionFacts(detail({ min_level: 30, turn_upside_down: true }), 687, {}).some(fact => fact.id === 'upsideDown'))
  assert.ok(knowledgeEvolutionFacts(detail({ min_level: 50, needs_overworld_rain: true }), 706, {}).some(fact => fact.id === 'rain'))
  assert.ok(knowledgeEvolutionFacts(detail({ party_type: resource('type', 17, 'dark') }), 675, {}).some(fact => fact.id === 'partyType'))
  assert.ok(knowledgeEvolutionFacts(detail({ condition_expression: { unknown: true } }), 700, {}).some(fact => fact.id === 'unconfirmed'))
  assert.ok(knowledgeEvolutionFacts(detail({ future_requirement: true }), 700, {}).some(fact => fact.id === 'unconfirmed'))
  assert.equal(evolutionForRules(node(705, [], [node(706, [detail({ region: resource('region', 9, 'hisui') })])]), rules, new Set())!.children.length, 0)
})

test('detail service resolves default varieties, caches raw multilingual data and respects cancellation', async () => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } })
  const calls: string[] = []
  const fetcher = (async (url: string | URL | Request) => {
    const path = String(url).split('/api/v2/')[1]
    calls.push(path)
    const data: Record<string, unknown> = {
      'pokemon-species/700': { id: 700, varieties: [{ is_default: true, pokemon: resource('pokemon', 10000, 'default-variety') }], evolution_chain: resource('evolution-chain', 67, '') },
      'pokemon/default-variety': { name: 'default-variety', stats, past_stats: [], moves: [{ move: { name: 'moonblast' }, version_group_details: [{ version_group: { name: 'x-y' }, move_learn_method: { name: 'level-up' }, level_learned_at: 20 }] }] },
      'move/moonblast': { ...move, names: [...move.names, { name: 'Fuerza Lunar', language: { name: 'es' } }] },
    }
    if (!data[path]) return new Response('', { status: 404 })
    return Response.json(data[path])
  }) as typeof fetch
  const service = createKnowledgeService(rules, fetcher)
  const entry = { id: 700, name: 'sylveon' }
  values.set('poke-chose:cache:x:knowledge-v1:pokemon/default-variety', '{}')
  assert.equal((await service.stats(entry)).hp, 100)
  assert.equal((await service.moves(entry, 'es'))[0].name, 'Fuerza Lunar')
  assert.equal((await service.moves(entry, 'en'))[0].name, 'Moonblast')
  assert.deepEqual(calls, ['pokemon-species/700', 'pokemon/default-variety', 'move/moonblast'])
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(service.stats(entry, controller.signal), { name: 'AbortError' })
  await assert.rejects(service.stats({ id: 722, name: 'rowlet' }))
  assert.equal(calls.length, 3)
})

test('evolution service validates cached trees, checks location regions and relocalizes raw names', async () => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } })
  const kalos = resource('location', 650, 'kalos-route-20')
  const unova = resource('location', 375, 'pinwheel-forest')
  const chain = node(133, [], [node(470, [detail({ location: kalos }), detail({ location: unova })])])
  values.set('poke-chose:cache:x:knowledge-v1:evolution-chain/67', JSON.stringify({ chain: { ...chain, evolves_to: [{ species: kalos }] } }))
  const calls: string[] = []
  const fetcher = (async (url: string | URL | Request) => {
    const path = String(url).split('/api/v2/')[1]
    calls.push(path)
    const data: Record<string, unknown> = {
      'pokemon-species/133': { id: 133, varieties: [{ is_default: true, pokemon: resource('pokemon', 133, 'eevee') }], evolution_chain: resource('evolution-chain', 67, '') },
      'evolution-chain/67': { chain },
      'location/650': { region: { name: 'kalos' }, names: [{ name: 'Ruta 20', language: { name: 'es' } }, { name: 'Route 20', language: { name: 'en' } }] },
      'location/375': { region: { name: 'unova' }, names: [{ name: 'Pinwheel Forest', language: { name: 'en' } }] },
    }
    return Response.json(data[path])
  }) as typeof fetch
  const service = createKnowledgeService(rules, fetcher)
  const entry = { id: 133, name: 'eevee' }
  const es = await service.evolution(entry, 'es')
  assert.equal(es.root.children[0].methods.length, 1)
  assert.equal(es.labels[kalos.url], 'Ruta 20')
  const en = await service.evolution(entry, 'en')
  assert.equal(en.labels[kalos.url], 'Route 20')
  assert.equal(calls.length, 4)
})
