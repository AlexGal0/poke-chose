import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixturePk6, xRosterFixture, refreshRosterChecksums } from './helpers/x-roster-fixture.ts'
import { readPk6, readPartyPk6 } from '../src/games/x/pk6.ts'
import { readXSavePokemon, xSaveReader } from '../src/games/x/save-pokedex.ts'
import { isPokedexBridgeSnapshot } from '../src/sources/pokedex-snapshot.ts'
import { xSavedPokemon, xSavedDescription, xSavedRosterService } from '../src/games/x/saved-roster.ts'
import { resolveSavedRoster, findRosterIndividual } from '../src/games/core/saved-roster.ts'
import { generationVIRules } from '../src/domain/type-rules.ts'
import { typeDefense } from '../src/domain/type-analysis.ts'
import { PokedexWatcher } from '../bridge/pokedex-watcher.ts'
import { createPokedexSource } from '../src/sources/pokedex-source.ts'
import { existsSync } from 'node:fs'

test('PK6 decrypts all 32 shuffle indices and separate party stream without mutating input', () => {
  for (let i = 0; i < 32; i++) {
    const bytes = fixturePk6({ constant: 0x80000000 + i * 8192, party: true, nickname: 'DoceLetrasXY', hp: 0 })
    const original = Buffer.from(bytes)
    const p = readPartyPk6(bytes, 0)
    assert.equal(p.speciesId, 653)
    assert.equal(p.nickname, 'DoceLetrasXY')
    assert.equal(p.personality, 0xabcdef01)
    assert.equal(p.trainerId, 0x11223344)
    assert.equal(p.gender, 'female')
    assert.equal(p.natureId, 12)
    assert.equal(p.currentHp, 0)
    assert.equal(p.maxHp, 30)
    assert.equal(p.currentStats?.speed, 30)
    assert.deepEqual(p.moveIds, [33, 52, 0, 0])
    assert.deepEqual(bytes, original)
  }
  assert.equal(readPk6(Buffer.alloc(232)), null)
  assert.equal(readPk6(fixturePk6({ speciesId: 0 })), null)
  assert.equal(readPk6(fixturePk6({ egg: true }))?.isEgg, true)
  const corrupt = fixturePk6(); corrupt[30] ^= 1
  assert.throws(() => readPk6(corrupt))
})

test('X reads all 31 boxes and party count; validates consumed blocks and occupied records atomically', () => {
  const bytes = xRosterFixture()
  const roster = readXSavePokemon(bytes)
  assert.equal(roster.party.length, 1)
  assert.equal(roster.boxes.length, 1)
  assert.equal(roster.boxes[0].box, 30)
  assert.equal(roster.boxes[0].slot, 29)
  assert.equal(roster.boxes[0].speciesId, 700)
  for (const offset of [0x14200 + 30, 0x22600 + 30]) {
    const corrupt = Buffer.from(bytes); corrupt[offset] ^= 1
    assert.throws(() => readXSavePokemon(corrupt))
    refreshRosterChecksums(corrupt)
    assert.throws(() => readXSavePokemon(corrupt))
  }
  const badCount = Buffer.from(bytes); badCount[0x14200 + 6 * 260] = 7; refreshRosterChecksums(badCount)
  assert.throws(() => readXSavePokemon(badCount))
  const hole = Buffer.from(bytes); hole.fill(0, 0x14200, 0x14200 + 260); refreshRosterChecksums(hole)
  assert.throws(() => readXSavePokemon(hole))
})

test('snapshot limits permit Gen VI species, box 31 and 12-letter nicknames without widening Black', () => {
  const roster = readXSavePokemon(xRosterFixture())
  const snapshot = { protocol: 1, sourceId: 'x-save', status: 'ready', message: 'ready', pokedex: { seenSpeciesIds: [653], caughtSpeciesIds: [653] }, updatedAt: new Date().toISOString(), ...roster }
  const limits = { maxSpecies: 721, boxCount: 31, nicknameLength: 12 }
  assert.ok(isPokedexBridgeSnapshot(snapshot, 'x-save', 721, limits))
  assert.equal(isPokedexBridgeSnapshot(snapshot, 'x-save', 721), false)
  assert.equal(isPokedexBridgeSnapshot(snapshot, 'x-save', 721, { ...limits, boxCount: 24 }), false)
  assert.equal(isPokedexBridgeSnapshot({ ...snapshot, boxes: [...roster.boxes, ...roster.boxes] }, 'x-save', 721, limits), false)
  assert.equal(isPokedexBridgeSnapshot({ ...snapshot, party: [{ ...roster.party[0], currentHp: 31 }] }, 'x-save', 721, limits), false)
})

test('offline X resolver preserves form types, duplicate instances, eggs and local names', async () => {
  assert.deepEqual((await xSavedPokemon({ speciesId: 700, form: 0 })).types, ['fairy'])
  assert.deepEqual((await xSavedPokemon({ speciesId: 479, form: 2 })).types, ['electric', 'water'])
  assert.deepEqual((await xSavedPokemon({ speciesId: 413, form: 2 })).types, ['bug', 'steel'])
  assert.deepEqual((await xSavedPokemon({ speciesId: 493, form: 17 })).types, ['fairy'])
  assert.equal((await xSavedPokemon({ speciesId: 710, form: 0 })).resourceName, 'pumpkaboo-small')
  await assert.rejects(xSavedPokemon({ speciesId: 653, form: 1 }))
  const member = readPartyPk6(fixturePk6({ party: true }), 0)
  assert.deepEqual((await xSavedDescription(member, 'es')).moves, ['Placaje', 'Ascuas'])
  assert.equal((await xSavedDescription(member, 'en')).item, 'Potion')
  const roster = await resolveSavedRoster(xSavedRosterService, [member, { ...member, slot: 1, isEgg: true }], [{ ...member, box: 30, slot: 29 }])
  assert.equal(roster.collection.length, 3)
  assert.equal(new Set(roster.collection.map(p => p.instanceKey)).size, 3)
  assert.equal(roster.collection[2].level, 12)
  assert.ok(roster.collection.every(p => !p.sprite || p.sprite.startsWith('/pokemon-x/')))
  const analysis = typeDefense(generationVIRules, roster.party.filter(p => !p.isEgg))
  assert.equal(analysis[0].members.length, 1)
})

test('watcher retains the full previous roster on corruption and publishes party-only changes', async () => {
  let bytes = xRosterFixture()
  const watcher = new PokedexWatcher('unused/main', 'x-save', xSaveReader, () => {}, { read: async () => bytes, recoveryMs: 5, retryMs: [], debounceMs: 1 })
  const waitUntil = async (predicate: () => boolean) => {
    for (let i = 0; i < 100 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 5))
    assert.ok(predicate())
  }
  try {
    watcher.start()
    await waitUntil(() => watcher.snapshot.status === 'ready')
    const last = watcher.snapshot.party
    bytes = Buffer.from(bytes); bytes[0x14210] ^= 1
    await waitUntil(() => watcher.snapshot.status === 'error')
    assert.equal(watcher.snapshot.party, last)
    bytes = xRosterFixture(); fixturePk6({ party: true, hp: 0 }).copy(bytes, 0x14200); refreshRosterChecksums(bytes)
    await waitUntil(() => watcher.snapshot.status === 'ready' && watcher.snapshot.party?.[0].currentHp === 0)
    assert.equal(watcher.snapshot.boxes?.[0].box, 30)
  } finally { watcher.stop() }
})

test('X roster resolves the whole National catalog and names without outbound fetches', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Unexpected outbound request') }
  try {
    for (let speciesId = 1; speciesId <= 721; speciesId++) {
      const pokemon = await xSavedPokemon({ speciesId, form: 0 })
      assert.equal(pokemon.id, speciesId)
      assert.ok(pokemon.types.length >= 1 && pokemon.types.every(type => generationVIRules.types.includes(type)))
      assert.equal(pokemon.experienceLevels.length, 100)
      if (pokemon.sprite) assert.ok(existsSync(new URL(`../public${pokemon.sprite}`, import.meta.url)))
    }
    const member = readPartyPk6(fixturePk6({ party: true }), 0)
    assert.equal((await xSavedDescription(member, 'es')).item, 'Poción')
    assert.equal((await xSavedDescription(member, 'en')).item, 'Potion')
  } finally { globalThis.fetch = originalFetch }
})

test('SSE client retains complete roster across disconnect/restart and isolates new subscriptions', () => {
  const connection = { onmessage: null as null | ((event: { data: string }) => void), onerror: null as null | (() => void), close() {} }
  const source = createPokedexSource('x-save', 721, () => connection, { maxSpecies: 721, boxCount: 31, nicknameLength: 12 })
  const updates: { party?: unknown[]; status: string }[] = []
  const close = source.subscribe(snapshot => updates.push(snapshot))
  const roster = readXSavePokemon(xRosterFixture())
  const ready = { protocol: 1, sourceId: 'x-save', status: 'ready', message: 'ready', pokedex: { seenSpeciesIds: [653], caughtSpeciesIds: [653] }, updatedAt: new Date().toISOString(), ...roster }
  connection.onmessage?.({ data: JSON.stringify(ready) })
  assert.equal(updates.at(-1)?.party?.length, 1)
  connection.onerror?.()
  assert.equal(updates.at(-1)?.status, 'error')
  assert.equal(updates.at(-1)?.party?.length, 1)
  connection.onmessage?.({ data: JSON.stringify({ protocol: 1, sourceId: 'x-save', status: 'waiting', message: 'waiting', pokedex: null, updatedAt: null }) })
  assert.equal(updates.at(-1)?.party?.length, 1)
  const count = updates.length
  connection.onmessage?.({ data: JSON.stringify({ ...ready, boxes: [...roster.boxes, ...roster.boxes] }) })
  assert.equal(updates.length, count)
  close()
  connection.onmessage?.({ data: JSON.stringify(ready) })
  assert.equal(updates.length, count)
  const newUpdates: { party?: unknown[] }[] = []
  const closeNew = source.subscribe(snapshot => newUpdates.push(snapshot))
  assert.equal(newUpdates[0].party, undefined)
  closeNew()
})


test('individual moves preserve slots and use local XY metadata in both languages', async () => {
  const member = readPartyPk6(fixturePk6({ party: true }), 0)
  const described = await xSavedDescription({ ...member, moveIds: [33, 0, 52, 33] }, 'es')
  assert.deepEqual(described.knownMoves.map(move => [move.slot, move.id]), [[0, 33], [2, 52], [3, 33]])
  const tackle = described.knownMoves[0]
  assert.equal(tackle.name, 'Placaje')
  assert.equal(tackle.type, 'normal')
  assert.equal(tackle.pp, 35)
  assert.equal(tackle.power, 50)
  assert.equal(tackle.accuracy, 100)
  assert.ok(tackle.description)
  assert.equal(described.knownMoves[1].type, 'fire')
  assert.equal(described.knownMoves[1].pp, 25)
  assert.equal((await xSavedDescription(member, 'en')).knownMoves[0].name, 'Tackle')
  await assert.rejects(xSavedDescription({ ...member, moveIds: [10001, 0, 0, 0] }, 'es'))
  assert.notDeepEqual((await xSavedPokemon({ speciesId: 479, form: 0 })).baseStats, (await xSavedPokemon({ speciesId: 479, form: 2 })).baseStats)
})

test('open individual follows a unique identity across slots and rejects ambiguous replacements', async () => {
  const member = readPartyPk6(fixturePk6({ party: true }), 0)
  const { party: [selected] } = await resolveSavedRoster(xSavedRosterService, [member], [])
  const moved = { ...selected, instanceKey: 'new-slot', slot: 1 }
  assert.equal(findRosterIndividual(selected, [moved]), moved)
  assert.equal(findRosterIndividual(selected, [moved, selected]), selected)
  assert.equal(findRosterIndividual(selected, [moved, { ...moved, instanceKey: 'clone' }]), undefined)
  assert.equal(findRosterIndividual(selected, [{ ...moved, trainerId: moved.trainerId + 1 }]), undefined)
  assert.equal(findRosterIndividual(selected, [{ ...moved, isEgg: true }]), undefined)
  assert.equal(findRosterIndividual(selected, []), undefined)
})
