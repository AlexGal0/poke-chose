import test from 'node:test'
import assert from 'node:assert/strict'
import { evolutionLevelsRemaining } from '../src/domain/evolution-progress.ts'
import type { EvolutionDetail } from '../src/models/evolution.ts'
import type { KnowledgeEvolutionDetail } from '../src/domain/species-knowledge.ts'

const method: EvolutionDetail = { trigger: { name: 'level-up', url: '' }, min_level: 16 }

test('PokéAPI default-method metadata does not hide the countdown in X', () => {
  const apiMethod: KnowledgeEvolutionDetail = {
    ...method,
    version_group: { name: 'red-blue', url: 'https://pokeapi.co/api/v2/version-group/1/' },
    is_default: true,
    item: null, gender: null, held_item: null, known_move: null, known_move_type: null,
    location: null, min_happiness: null, min_beauty: null, min_affection: null,
    near_special_rock: false, needs_multiplayer: false, needs_overworld_rain: false,
    party_species: null, party_type: null, relative_physical_stats: null, time_of_day: '',
    trade_species: null, turn_upside_down: false, region: null, required_pokemon_form: null,
    evolved_pokemon_form: null, used_move: null, min_move_count: null, min_steps: null,
    min_damage_taken: null, allowed_natures: null, condition_expression: null,
  }
  assert.equal(evolutionLevelsRemaining([apiMethod], 11), 5)
  assert.equal(evolutionLevelsRemaining([{ ...apiMethod, needs_multiplayer: true }], 11), null)
  assert.equal(evolutionLevelsRemaining([{ ...apiMethod, unknown_requirement: true }], 11), null)
})

test('counts levels to the closest direct evolution and clamps reached thresholds', () => {
  assert.equal(evolutionLevelsRemaining([method], 11), 5)
  assert.equal(evolutionLevelsRemaining([method], 16), 0)
  assert.equal(evolutionLevelsRemaining([method], 20), 0)
  assert.equal(evolutionLevelsRemaining([method, { ...method, min_level: 14 }], 11), 3)
})

test('does not invent countdowns for special requirements across game generations', () => {
  for (const condition of [{ gender: 1 }, { held_item: { name: 'item', url: '' } }, { min_happiness: 220 }, { time_of_day: 'night' }, { needs_overworld_rain: true }, { min_affection: 2 }, { relative_physical_stats: 0 }]) {
    assert.equal(evolutionLevelsRemaining([{ ...method, ...condition }], 11), null)
  }
  assert.equal(evolutionLevelsRemaining([{ ...method, trigger: { name: 'trade', url: '' } }], 11), null)
  assert.equal(evolutionLevelsRemaining([{ ...method, min_level: null }], 11), null)
  assert.equal(evolutionLevelsRemaining([], 11), null)
})

test('requires a valid individual level and tolerates empty API condition fields', () => {
  for (const level of [null, undefined, 0, 101, 1.5, NaN]) assert.equal(evolutionLevelsRemaining([method], level), null)
  assert.equal(evolutionLevelsRemaining([{ ...method, gender: null, time_of_day: '', near_special_rock: false }], 10), 6)
})
